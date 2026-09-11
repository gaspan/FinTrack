import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { CategoryQueries, WalletQueries, TransactionQueries, TagQueries, RecurringQueries } from '@/lib/queries';
import { Category, Wallet, TransactionType } from '@/types';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { checkBudgetAlerts } from '@/features/notifications/budgetReminder';
import { hapticSuccess } from '@/utils/haptic';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { findSalaryCategoryId } from '@/utils/payroll';
import { useReceiptScan } from '@/features/receipt-scan/useReceiptScan';
import { formatRupiah } from '@/utils/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

const PAYROLL_ENABLED_KEY = 'payroll_enabled';

async function suggestRecurringSalary(
  db: SQLiteDatabase,
  bookId: number,
  data: { type: TransactionType; amount: number; category_id: number; wallet_id: number; transaction_date: string; notes: string }
) {
  const enabled = await AsyncStorage.getItem(PAYROLL_ENABLED_KEY);
  if (enabled === 'false' || !enabled) return;

  const salaryCategoryId = await findSalaryCategoryId(db, bookId, null);
  if (!salaryCategoryId || data.category_id !== salaryCategoryId) return;

  const existing = await new RecurringQueries(db, bookId).getAll();
  if (existing.some(r => r.type === 'income' && r.is_active === 1)) return;

  Alert.alert(
    'Gaji rutin?',
    'Jadikan pemasukan ini sebagai transaksi berulang otomatis setiap bulan?',
    [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Atur',
        onPress: async () => {
          try {
            await new RecurringQueries(db, bookId).create({
              type: 'income',
              amount: data.amount,
              category_id: data.category_id,
              wallet_id: data.wallet_id,
              frequency: 'monthly',
              next_date: dayjs(data.transaction_date).add(1, 'month').format('YYYY-MM-DD'),
              notes: `${data.notes || 'Gaji'} (Otomatis)`,
            });
            hapticSuccess();
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Gagal membuat transaksi berulang');
          }
        },
      },
    ]
  );
}

export default function AddTransactionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook, books } = useBook();
  const bookId = activeBook?.id ?? 1;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [scanPatchId, setScanPatchId] = useState(0);
  const [scannedPatch, setScannedPatch] = useState<{
    amount: number | null;
    transactionDate: string | null;
    notes: string | null;
    attachmentUri?: string | null;
    patchId: number;
  } | null>(null);
  const { scanning, scanFromCamera, scanFromGallery } = useReceiptScan();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const categoryQueries = new CategoryQueries(db, bookId);
      const walletQueries = new WalletQueries(db, bookId);
      
      const [cats, walls] = await Promise.all([
        categoryQueries.getAll(),
        walletQueries.getAll()
      ]);
      
      setCategories(cats);
      setWallets(walls);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat data kategori dan dompet');
    } finally {
      setLoading(false);
    }
  }, [db, bookId]);

  useFocusEffect(
    useCallback(() => {
      setShowSuccess(false);
      loadData();
    }, [loadData])
  );

  const applyScanResult = useCallback(async (result: {
    amount: number | null;
    date: Date | null;
    merchantName: string | null;
    imageUri: string;
  }) => {
    // Simpan foto struk sebagai lampiran persisten (pola sama seperti TransactionForm).
    let attachmentUri: string | null = null;
    try {
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const dest = FileSystem.documentDirectory + 'attachments/' + fileName;
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'attachments/', { intermediates: true });
      await FileSystem.copyAsync({ from: result.imageUri, to: dest });
      attachmentUri = dest;
    } catch {
      attachmentUri = result.imageUri;
    }
    const patchId = scanPatchId + 1;
    setScanPatchId(patchId);
    setScannedPatch({
      amount: result.amount,
      transactionDate: result.date ? dayjs(result.date).format('YYYY-MM-DD') : null,
      notes: result.merchantName ? `${result.merchantName} (Scan struk)` : null,
      attachmentUri,
      patchId,
    });
    hapticSuccess();
    Alert.alert(
      'Struk terpindai',
      result.amount
        ? `Nominal ${formatRupiah(result.amount)} terisi otomatis. Periksa kembali sebelum menyimpan.`
        : 'Struk terbaca, tapi nominal tidak ditemukan. Silakan isi manual.',
    );
  }, [scanPatchId]);

  const handleScanPress = useCallback(() => {
    if (Platform.OS === 'web') {
      Alert.alert('Tidak didukung', 'Pindai struk hanya tersedia di aplikasi Android/iOS.');
      return;
    }
    if (Constants.appOwnership === 'expo') {
      Alert.alert(
        'Butuh Development Build',
        'Fitur scan struk memakai modul native yang tidak tersedia di Expo Go. Bangun development client dengan eas build --profile development, install APK-nya, lalu buka proyek dari Dev Client.',
      );
      return;
    }
    Alert.alert('Scan Struk', 'Pilih sumber foto struk belanja', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Kamera',
        onPress: async () => {
          const result = await scanFromCamera();
          if (result) await applyScanResult(result);
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const result = await scanFromGallery();
          if (result) await applyScanResult(result);
        },
      },
    ]);
  }, [applyScanResult, scanFromCamera, scanFromGallery]);

  // Buka dialog scan otomatis saat masuk lewat FAB "Scan Struk" (?scan=1)
  const { scan } = useLocalSearchParams<{ scan?: string }>();
  const autoScanFired = React.useRef(false);
  React.useEffect(() => {
    if (scan === '1' && !autoScanFired.current && !loading) {
      autoScanFired.current = true;
      handleScanPress();
    }
  }, [scan, loading, handleScanPress]);

  const handleSubmit = async (data: {
    type: TransactionType;
    amount: number;
    category_id: number;
    wallet_id: number;
    transaction_date: string;
    notes: string;
    tags: number[];
    attachmentPaths: string[];
  }) => {
    try {
      setSubmitting(true);
      const txQueries = new TransactionQueries(db, bookId);
      
      const newId = await txQueries.create({
        type: data.type,
        amount: data.amount,
        category_id: data.category_id,
        wallet_id: data.wallet_id,
        transaction_date: data.transaction_date,
        notes: data.notes,
        recurring_id: null,
      });

      if (data.tags.length > 0) {
        const tagQueries = new TagQueries(db, bookId);
        await tagQueries.setTransactionTags(newId, data.tags);
      }

      for (const path of data.attachmentPaths) {
        await txQueries.addAttachment(newId, path);
      }

      hapticSuccess();
      setShowSuccess(true);
      
      if (data.type === 'expense') {
        checkBudgetAlerts(db, books).catch(console.error);
      } else {
        suggestRecurringSalary(db, bookId, data).catch(console.error);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {Platform.OS !== 'web' && (
          <TouchableOpacity onPress={handleScanPress} disabled={scanning} style={styles.scanBtn}>
            {scanning ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
            )}
            <Text style={styles.scanBtnText}>{scanning ? 'Memindai...' : 'Scan Struk'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <TransactionForm 
        categories={categories}
        wallets={wallets}
        onSubmit={handleSubmit}
        loading={submitting}
        scannedPatch={scannedPatch}
      />
      <SuccessAnimation
        visible={showSuccess}
        message="Transaksi tersimpan!"
        onFinish={() => router.navigate('/(tabs)' as any)}
      />
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

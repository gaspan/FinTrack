import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { CategoryQueries, WalletQueries, TransactionQueries, TagQueries } from '@/lib/queries';
import { Category, Wallet, TransactionType } from '@/types';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { checkBudgetAlerts } from '@/features/notifications/budgetReminder';
import { hapticSuccess } from '@/utils/haptic';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';

export default function AddTransactionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const categoryQueries = new CategoryQueries(db);
      const walletQueries = new WalletQueries(db);
      
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
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      setShowSuccess(false);
      loadData();
    }, [loadData])
  );

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
      const txQueries = new TransactionQueries(db);
      
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
        const tagQueries = new TagQueries(db);
        await tagQueries.setTransactionTags(newId, data.tags);
      }

      for (const path of data.attachmentPaths) {
        await txQueries.addAttachment(newId, path);
      }

      hapticSuccess();
      setShowSuccess(true);
      
      if (data.type === 'expense') {
        checkBudgetAlerts(db).catch(console.error);
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
      <TransactionForm 
        categories={categories}
        wallets={wallets}
        onSubmit={handleSubmit}
        loading={submitting}
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
  }
});

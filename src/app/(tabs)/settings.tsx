import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';

import { theme } from '@/constants/theme';
import { WalletQueries, RecurringQueries } from '@/lib/queries';
import { Wallet } from '@/types';
import { WalletForm } from '@/components/forms/WalletForm';
import { formatRupiah } from '@/utils/format';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [, setRecurringCount] = useState(0);
  const [showWalletForm, setShowWalletForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const walletQueries = new WalletQueries(db);
      const recurringQueries = new RecurringQueries(db);
      
      const walls = await walletQueries.getAll();
      setWallets(walls);
      
      const recurring = await recurringQueries.getAll();
      setRecurringCount(recurring.length);
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatRp = formatRupiah;

  const handleAddWallet = async (data: { name: string; balance: number; icon: string; color: string }) => {
    try {
      await db.runAsync(
        'INSERT INTO wallets (name, balance, icon, color) VALUES (?, ?, ?, ?)',
        [data.name, data.balance, data.icon, data.color]
      );
      setShowWalletForm(false);
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal menambah dompet');
    }
  };

  const handleDeleteWallet = (id: number) => {
    if (wallets.length === 1) {
      Alert.alert('Gagal', 'Anda harus memiliki minimal 1 dompet.');
      return;
    }
    
    Alert.alert(
      'Hapus Dompet',
      'Yakin ingin menghapus dompet ini? Transaksi yang terhubung akan kehilangan referensi dompet.',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
              await loadData();
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      
      {/* Wallet Management Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manajemen Dompet</Text>
          <TouchableOpacity onPress={() => setShowWalletForm(true)}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {wallets.map(wallet => (
          <View key={wallet.id} style={styles.listItem}>
            <View style={styles.itemInfo}>
              <View style={[styles.iconContainer, { backgroundColor: (wallet.color || theme.colors.primary) + '20' }]}>
                <Ionicons name={(wallet.icon || 'wallet') as any} size={20} color={wallet.color || theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.itemTitle}>{wallet.name}</Text>
                <Text style={styles.itemSubtitle}>{formatRp(wallet.balance)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDeleteWallet(wallet.id)}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* App Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fitur Tambahan</Text>
        
        {/*
        <TouchableOpacity style={styles.listItem} onPress={() => {}}>
          <View style={styles.itemInfo}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceElevated }]}>
              <Ionicons name="sync-outline" size={20} color={theme.colors.textPrimary} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Transaksi Berulang</Text>
              <Text style={styles.itemSubtitle}>{recurringCount} aktif</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        */}

        <TouchableOpacity style={styles.listItem} onPress={() => router.push('/export')}>
          <View style={styles.itemInfo}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceElevated }]}>
              <Ionicons name="download-outline" size={20} color={theme.colors.textPrimary} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Ekspor Laporan (Excel)</Text>
              <Text style={styles.itemSubtitle}>Unduh data transaksi (.xlsx)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tentang</Text>
        <View style={styles.listItem}>
          <Text style={styles.itemTitle}>FinTrack Version</Text>
          <Text style={styles.itemSubtitle}>v1.0.0</Text>
        </View>
      </View>

      <Modal
        visible={showWalletForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWalletForm(false)}
      >
        <View style={styles.modalContainer}>
          <WalletForm 
            onCancel={() => setShowWalletForm(false)}
            onSubmit={handleAddWallet}
          />
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  itemTitle: {
    ...theme.typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtitle: {
    ...theme.typography.caption,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 40,
  }
});

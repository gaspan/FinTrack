import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect } from 'expo-router';

import { theme } from '@/constants/theme';
import { CategoryQueries, WalletQueries, TransactionQueries } from '@/lib/queries';
import { Category, Wallet, TransactionType } from '@/types';
import { TransactionForm } from '@/components/forms/TransactionForm';

export default function AddTransactionScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  }) => {
    try {
      setSubmitting(true);
      const txQueries = new TransactionQueries(db);
      
      await txQueries.create({
        ...data,
        recurring_id: null
      });
      
      // Go back to Dashboard after saving
      router.navigate('/(tabs)/');
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  }
});

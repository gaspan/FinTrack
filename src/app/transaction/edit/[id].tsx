import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { theme } from '@/constants/theme';
import { CategoryQueries, WalletQueries, TransactionQueries } from '@/lib/queries';
import { Category, Wallet, TransactionType, TransactionWithDetails } from '@/types';
import { TransactionForm } from '@/components/forms/TransactionForm';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const txId = parseInt(id, 10);
        if (isNaN(txId)) return;

        const categoryQueries = new CategoryQueries(db);
        const walletQueries = new WalletQueries(db);

        const [tx, cats, walls] = await Promise.all([
          db.getFirstAsync<TransactionWithDetails>(`
            SELECT 
              t.*, 
              c.name as category_name, 
              c.icon as category_icon, 
              c.color as category_color, 
              w.name as wallet_name 
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            JOIN wallets w ON t.wallet_id = w.id
            WHERE t.id = ?
          `, [txId]),
          categoryQueries.getAll(),
          walletQueries.getAll()
        ]);

        if (tx) setTransaction(tx);
        setCategories(cats);
        setWallets(walls);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Gagal memuat data transaksi');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, db]);

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
      await txQueries.update(parseInt(id, 10), data);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memperbarui transaksi');
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

  if (!transaction) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TransactionForm
        initialData={{
          type: transaction.type,
          amount: transaction.amount,
          category_id: transaction.category_id,
          wallet_id: transaction.wallet_id,
          transaction_date: transaction.transaction_date,
          notes: transaction.notes,
        }}
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
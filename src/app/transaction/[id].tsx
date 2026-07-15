import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { theme } from '@/constants/theme';
import { TransactionQueries } from '@/lib/queries';
import { TransactionWithDetails } from '@/types';
import { Button } from '@/components/ui/Button';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const txId = parseInt(id, 10);
        if (isNaN(txId)) return;

        // Custom query to get detail for 1 tx
        const tx = await db.getFirstAsync<TransactionWithDetails>(`
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
        `, [txId]);

        if (tx) setTransaction(tx);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [id, db]);

  const handleDelete = () => {
    Alert.alert(
      'Hapus Transaksi',
      'Yakin ingin menghapus transaksi ini? Saldo dompet akan disesuaikan kembali.',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const txQueries = new TransactionQueries(db);
              await txQueries.delete(parseInt(id, 10));
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Gagal menghapus transaksi');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const formatRp = (val: number) => `Rp ${val.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".")}`;

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
        <Text style={{ color: theme.colors.textPrimary }}>Transaksi tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={[styles.iconContainer, { backgroundColor: transaction.category_color + '20' }]}>
          <Ionicons name={transaction.category_icon as any} size={40} color={transaction.category_color} />
        </View>
        <Text style={styles.categoryName}>{transaction.category_name}</Text>
        <Text style={[
          styles.amount,
          { color: transaction.type === 'income' ? theme.colors.income : theme.colors.textPrimary }
        ]}>
          {transaction.type === 'income' ? '+' : '-'}{formatRp(transaction.amount)}
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tanggal</Text>
          <Text style={styles.detailValue}>{dayjs(transaction.transaction_date).format('DD MMMM YYYY')}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dompet</Text>
          <Text style={styles.detailValue}>{transaction.wallet_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tipe</Text>
          <Text style={styles.detailValue}>
            {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </Text>
        </View>
        {transaction.notes && (
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Catatan</Text>
            <Text style={styles.detailValue}>{transaction.notes}</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }} />
      
      <Button 
        title="Hapus Transaksi" 
        variant="danger" 
        onPress={handleDelete}
        loading={deleting}
        fullWidth
        style={{ marginBottom: theme.spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  headerCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  categoryName: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  amount: {
    ...theme.typography.h1,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    ...theme.typography.body,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '60%',
  }
});

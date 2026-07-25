import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { WalletQueries } from '@/lib/queries';
import { Wallet } from '@/types';
import { NumericInput } from '@/components/ui/NumericInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/utils/format';

export default function TransferScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    new WalletQueries(db).getAll().then(setWallets).catch(console.error);
  }, [db]));

  const handleTransfer = async () => {
    if (!sourceId || !targetId || amount <= 0) return;
    if (sourceId === targetId) {
      Alert.alert('Error', 'Dompet asal dan tujuan harus berbeda.');
      return;
    }

    const source = wallets.find(w => w.id === sourceId);
    if (source && source.balance < amount) {
      Alert.alert('Saldo Tidak Mencukupi', `Saldo "${source.name}" hanya ${formatRupiah(source.balance)}`);
      return;
    }

    try {
      setLoading(true);
      const expenseCat = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categories WHERE type = 'expense' AND name = 'Lainnya' LIMIT 1"
      );
      const incomeCat = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM categories WHERE type = 'income' AND name = 'Lainnya' LIMIT 1"
      );
      if (!expenseCat || !incomeCat) throw new Error('Kategori tidak ditemukan');

      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE wallets SET balance = balance - ? WHERE id = ?', [amount, sourceId]);
        await db.runAsync('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amount, targetId]);
        await db.runAsync(
          'INSERT INTO transactions (type, amount, category_id, wallet_id, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
          ['expense', amount, expenseCat.id, sourceId, dayjs().format('YYYY-MM-DD'), notes ? `Transfer: ${notes}` : 'Transfer antar dompet']
        );
        await db.runAsync(
          'INSERT INTO transactions (type, amount, category_id, wallet_id, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
          ['income', amount, incomeCat.id, targetId, dayjs().format('YYYY-MM-DD'), notes ? `Transfer: ${notes}` : 'Transfer antar dompet']
        );
      });
      Alert.alert('Berhasil', 'Transfer berhasil dilakukan.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal melakukan transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Transfer Antar Dompet</Text>
      <Text style={styles.subtitle}>Pindahkan saldo antar dompet Anda</Text>

      <Text style={styles.label}>Dompet Asal</Text>
      <View style={styles.walletRow}>
        {wallets.map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.walletCard, sourceId === w.id && styles.walletActive]}
            onPress={() => { setSourceId(w.id); if (w.id === targetId) setTargetId(null); }}
          >
            <View style={[styles.walletIcon, { backgroundColor: (w.color || theme.colors.primary) + '20' }]}>
              <Ionicons name={(w.icon || 'wallet') as any} size={20} color={w.color || theme.colors.primary} />
            </View>
            <Text style={styles.walletName}>{w.name}</Text>
            <Text style={[styles.walletBalance, sourceId === w.id && { color: theme.colors.income }]}>
              {formatRupiah(w.balance)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Dompet Tujuan</Text>
      <View style={styles.walletRow}>
        {wallets.map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.walletCard, targetId === w.id && styles.walletActiveTarget]}
            onPress={() => { setTargetId(w.id); if (w.id === sourceId) setSourceId(null); }}
          >
            <View style={[styles.walletIcon, { backgroundColor: (w.color || theme.colors.primary) + '20' }]}>
              <Ionicons name={(w.icon || 'wallet') as any} size={20} color={w.color || theme.colors.primary} />
            </View>
            <Text style={styles.walletName}>{w.name}</Text>
            <Text style={[styles.walletBalance, targetId === w.id && { color: theme.colors.income }]}>
              {formatRupiah(w.balance)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <NumericInput label="Jumlah Transfer" value={amount} onChangeValue={setAmount} />
      <Input label="Catatan (Opsional)" placeholder="Biaya, keperluan, dll" value={notes} onChangeText={setNotes} />

      {sourceId && targetId && amount > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {wallets.find(w => w.id === sourceId)?.name} → {wallets.find(w => w.id === targetId)?.name}
          </Text>
          <Text style={styles.summaryAmount}>{formatRupiah(amount)}</Text>
        </View>
      )}

      <Button
        title="Transfer Sekarang"
        onPress={handleTransfer}
        disabled={!sourceId || !targetId || amount <= 0 || sourceId === targetId}
        loading={loading}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  title: { ...theme.typography.h2, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  walletCard: {
    width: '47%', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, padding: theme.spacing.md, alignItems: 'center',
  },
  walletActive: { borderColor: theme.colors.expense, backgroundColor: theme.colors.surfaceElevated },
  walletActiveTarget: { borderColor: theme.colors.income, backgroundColor: theme.colors.surfaceElevated },
  walletIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
  walletName: { ...theme.typography.body, fontWeight: '600', marginBottom: 2 },
  walletBalance: { ...theme.typography.caption },
  summary: {
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md,
    padding: theme.spacing.md, alignItems: 'center', marginVertical: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  summaryText: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: 4 },
  summaryAmount: { ...theme.typography.h2, color: theme.colors.primary },
});

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { WalletQueries } from '@/lib/queries';
import { Wallet } from '@/types';
import { WalletForm } from '@/components/forms/WalletForm';
import { formatRupiah } from '@/utils/format';

export default function WalletsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);

  const loadData = useCallback(async () => {
    try { setWallets(await new WalletQueries(db).getAll()); } catch (e) { console.error(e); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = async (data: { name: string; balance: number; icon: string; color: string }) => {
    const name = data.name.trim();
    const duplicate = wallets.find(
      w => w.name.toLowerCase() === name.toLowerCase() && w.id !== editing?.id
    );
    if (duplicate) { Alert.alert('Duplikat', `Dompet "${name}" sudah ada.`); return; }
    try {
      const q = new WalletQueries(db);
      if (editing) await q.update(editing.id, { ...data, name });
      else await q.create({ ...data, name });
      closeForm();
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', editing ? 'Gagal menyimpan dompet' : 'Gagal menambah dompet');
    }
  };

  const handleDelete = async (wallet: Wallet) => {
    if (wallets.length === 1) { Alert.alert('Gagal', 'Minimal 1 dompet.'); return; }
    const txCount = await new WalletQueries(db).countTransactions(wallet.id);
    Alert.alert(
      'Hapus Dompet',
      txCount > 0
        ? `"${wallet.name}" punya ${txCount} transaksi. Transaksi tersebut akan kehilangan referensi dompet. Lanjutkan?`
        : `Hapus dompet "${wallet.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try { await new WalletQueries(db).delete(wallet.id); loadData(); }
            catch (e) { console.error(e); Alert.alert('Error', 'Gagal menghapus dompet'); }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (id: number) => {
    await new WalletQueries(db).setPrimary(id);
    loadData();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manajemen Dompet</Text>
        <TouchableOpacity onPress={() => { setEditing(null); setShowForm(true); }}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {wallets.map(w => (
        <View key={w.id} style={styles.item}>
          <TouchableOpacity
            style={styles.itemLeft}
            onPress={() => !w.is_primary && handleSetPrimary(w.id)}
            onLongPress={() => { setEditing(w); setShowForm(true); }}
          >
            <View style={{ position: 'relative' }}>
              <View style={[styles.icon, { backgroundColor: (w.color || theme.colors.primary) + '20' }]}>
                <Ionicons name={(w.icon || 'wallet') as any} size={20} color={w.color || theme.colors.primary} />
              </View>
              {w.is_primary ? (
                <View style={styles.starBadge}>
                  <Ionicons name="star" size={12} color={theme.colors.warning} />
                </View>
              ) : (
                <View style={[styles.starBadge, styles.starBadgeInactive]}>
                  <Ionicons name="star-outline" size={12} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>
            <View>
              <Text style={styles.itemName}>{w.name} {w.is_primary ? '(Utama)' : ''}</Text>
              <Text style={styles.itemBalance}>{formatRupiah(w.balance)}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.itemActions}>
            <TouchableOpacity onPress={() => { setEditing(w); setShowForm(true); }} hitSlop={8}>
              <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(w)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={styles.hint}>Tap ikon dompet untuk menjadikan utama, tap ikon pensil untuk mengubah.</Text>
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
        <View style={styles.modal}>
          <WalletForm
            key={editing?.id ?? 'new'}
            initialData={editing ? {
              name: editing.name,
              balance: editing.initial_balance ?? editing.balance,
              icon: editing.icon || 'cash-outline',
              color: editing.color || theme.colors.primary,
            } : undefined}
            onCancel={closeForm}
            onSubmit={handleSubmit}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, paddingBottom: 0 },
  title: { ...theme.typography.h2 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: 0,
    padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  hint: { ...theme.typography.caption, padding: theme.spacing.md, textAlign: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  starBadge: { position: 'absolute', top: -4, right: theme.spacing.md - 4, backgroundColor: theme.colors.surface, borderRadius: 8, padding: 1 },
  starBadgeInactive: { opacity: 0.5 },
  itemName: { ...theme.typography.body, fontWeight: '500', marginBottom: 2 },
  itemBalance: { ...theme.typography.caption },
  modal: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 40 },
});

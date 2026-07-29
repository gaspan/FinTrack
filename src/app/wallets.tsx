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

  const loadData = useCallback(async () => {
    try { setWallets(await new WalletQueries(db).getAll()); } catch (e) { console.error(e); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAdd = async (data: { name: string; balance: number; icon: string; color: string }) => {
    const existing = wallets.find(w => w.name.toLowerCase() === data.name.trim().toLowerCase());
    if (existing) { Alert.alert('Duplikat', `Dompet "${data.name}" sudah ada.`); return; }
    try {
      await db.runAsync('INSERT INTO wallets (name, balance, icon, color) VALUES (?, ?, ?, ?)', [data.name, data.balance, data.icon, data.color]);
      setShowForm(false);
      loadData();
    } catch (e) { console.error(e); Alert.alert('Error', 'Gagal menambah dompet'); }
  };

  const handleDelete = (id: number) => {
    if (wallets.length === 1) { Alert.alert('Gagal', 'Minimal 1 dompet.'); return; }
    Alert.alert('Hapus Dompet', 'Yakin? Transaksi terkait akan kehilangan referensi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => { await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]); loadData(); }},
    ]);
  };

  const handleSetPrimary = async (id: number) => {
    await new WalletQueries(db).setPrimary(id);
    loadData();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manajemen Dompet</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {wallets.map(w => (
        <View key={w.id} style={styles.item}>
          <TouchableOpacity style={styles.itemLeft} onPress={() => !w.is_primary && handleSetPrimary(w.id)}>
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
          <TouchableOpacity onPress={() => handleDelete(w.id)}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      ))}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modal}>
          <WalletForm onCancel={() => setShowForm(false)} onSubmit={handleAdd} />
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
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  starBadge: { position: 'absolute', top: -4, right: theme.spacing.md - 4, backgroundColor: theme.colors.surface, borderRadius: 8, padding: 1 },
  starBadgeInactive: { opacity: 0.5 },
  itemName: { ...theme.typography.body, fontWeight: '500', marginBottom: 2 },
  itemBalance: { ...theme.typography.caption },
  modal: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 40 },
});

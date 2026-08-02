import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { RecurringQueries, CategoryQueries, WalletQueries } from '@/lib/queries';
import { RecurringTransaction, Category, Wallet, TransactionType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { formatRupiah } from '@/utils/format';
import { getSalaryProjection, type SalaryProjection } from '@/utils/salary';

const FREQ_LABELS: Record<string, string> = {
  daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan',
};

const FREQ_ICONS: Record<string, string> = {
  daily: 'sunny-outline', weekly: 'calendar-outline', monthly: 'calendar-outline', yearly: 'calendar-outline',
};

function countdown(date: string) {
  const d = dayjs(date);
  const now = dayjs();
  const diff = d.diff(now, 'day');
  if (diff < 0) return 'Terlewat';
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff <= 7) return `${diff} hari lagi`;
  return d.format('DD MMM');
}

export default function RecurringScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const router = useRouter();
  const [recurrings, setRecurrings] = useState<(RecurringTransaction & { category_name: string; wallet_name: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState(0);
  const [formCategory, setFormCategory] = useState<number | null>(null);
  const [formWallet, setFormWallet] = useState<number | null>(null);
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [formNotes, setFormNotes] = useState('');
  const [formNextDate, setFormNextDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [salaryProjection, setSalaryProjection] = useState<SalaryProjection | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [recs, cats, walls, salary] = await Promise.all([
        new RecurringQueries(db).getAll(),
        new CategoryQueries(db).getAll(),
        new WalletQueries(db).getAll(),
        getSalaryProjection(db).catch(() => null),
      ]);
      setRecurrings(recs);
      setCategories(cats);
      setWallets(walls);
      setSalaryProjection(salary);
    } catch (e) { console.error(e); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleToggle = async (id: number, current: number) => {
    await new RecurringQueries(db).toggle(id, current === 0);
    loadData();
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Transaksi Berulang', 'Yakin ingin menghapus?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        await new RecurringQueries(db).delete(id);
        loadData();
      }},
    ]);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormType('expense');
    setFormAmount(0);
    setFormCategory(null);
    setFormWallet(null);
    setFormFrequency('monthly');
    setFormNotes('');
    setFormNextDate(dayjs().format('YYYY-MM-DD'));
  };

  const handleAdd = async () => {
    if (!formAmount || !formCategory || !formWallet) return;
    try {
      setLoading(true);
      if (editingId) {
        await db.runAsync(
          'UPDATE recurring_transactions SET type=?, amount=?, category_id=?, wallet_id=?, frequency=?, notes=? WHERE id=?',
          [formType, formAmount, formCategory, formWallet, formFrequency, formNotes || null, editingId]
        );
      } else {
        await new RecurringQueries(db).create({
          type: formType, amount: formAmount, category_id: formCategory,
          wallet_id: formWallet, frequency: formFrequency,
          next_date: formNextDate,
          notes: formNotes || null,
        });
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) { console.error(e); Alert.alert('Error', 'Gagal menyimpan'); }
    finally { setLoading(false); }
  };

  const openSalarySetup = () => {
    if (!salaryProjection) return;
    setEditingId(null);
    setFormType('income');
    setFormAmount(salaryProjection.amount);
    setFormCategory(salaryProjection.salaryCategoryId);
    setFormWallet(wallets[0]?.id ?? null);
    setFormFrequency('monthly');
    setFormNotes('Gaji (Otomatis)');
    setFormNextDate(salaryProjection.nextDate);
    setShowForm(true);
  };

  const hasActiveIncome = recurrings.some(r => r.type === 'income' && r.is_active === 1);
  const filteredCategories = categories.filter(c => c.type === formType);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaksi Berulang</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {salaryProjection && !hasActiveIncome && (
        <TouchableOpacity style={styles.salaryBanner} activeOpacity={0.8} onPress={openSalarySetup}>
          <View style={styles.salaryIcon}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.salaryInfo}>
            <Text style={styles.salaryTitle}>Atur gaji otomatis?</Text>
            <Text style={styles.salarySub}>
              +{formatRupiah(salaryProjection.amount)} setiap bulan, mulai {dayjs(salaryProjection.nextDate).format('DD MMM')}
            </Text>
          </View>
          <Text style={styles.salaryCta}>Atur</Text>
        </TouchableOpacity>
      )}

      {recurrings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="sync-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Belum ada transaksi berulang</Text>
        </View>
      ) : (
        recurrings.map(r => (
          <View key={r.id} style={[styles.card, !r.is_active && styles.cardInactive]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardAmount}>
                  {r.type === 'income' ? '+' : '-'}{formatRupiah(r.amount)}
                </Text>
                <Text style={styles.cardCategory}>{r.category_name}</Text>
              </View>
              <TouchableOpacity onPress={() => handleToggle(r.id, r.is_active)}>
                <Ionicons
                  name={r.is_active ? 'toggle' : 'toggle-outline'}
                  size={36}
                  color={r.is_active ? theme.colors.primary : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name={FREQ_ICONS[r.frequency] as any} size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{FREQ_LABELS[r.frequency]}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="wallet-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{r.wallet_name}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{countdown(r.next_date)}</Text>
              </View>
            </View>
            {r.notes && <Text style={styles.notes}>{r.notes}</Text>}
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => {
                setEditingId(r.id);
                setFormType(r.type);
                setFormAmount(r.amount);
                setFormCategory(r.category_id);
                setFormWallet(r.wallet_id);
                setFormFrequency(r.frequency);
                setFormNotes(r.notes || '');
                setFormNextDate(r.next_date);
                setShowForm(true);
              }}>
                <Ionicons name="create-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(r.id)}>
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.actionText, { color: theme.colors.danger }]}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Transaksi Berulang' : 'Tambah Transaksi Berulang'}</Text>

            <View style={styles.typeSwitcher}>
              {(['expense', 'income'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeTab, formType === t && (t === 'income' ? styles.typeIncome : styles.typeExpense)]}
                  onPress={() => { setFormType(t); setFormCategory(null); }}
                >
                  <Text style={[styles.typeTabText, formType === t && styles.typeTabTextActive]}>
                    {t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <NumericInput label="Jumlah" value={formAmount} onChangeValue={setFormAmount} />

            <Text style={styles.fieldLabel}>Frekuensi</Text>
            <View style={styles.freqRow}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqChip, formFrequency === f && styles.freqChipActive]}
                  onPress={() => setFormFrequency(f)}
                >
                  <Text style={[styles.freqText, formFrequency === f && styles.freqTextActive]}>{FREQ_LABELS[f]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Kategori</Text>
            <View style={styles.categoryGrid}>
              {filteredCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catItem, formCategory === cat.id && { borderColor: cat.color }]}
                  onPress={() => setFormCategory(cat.id)}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Dompet</Text>
            <View style={styles.walletRow}>
              {wallets.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.walletChip, formWallet === w.id && styles.walletChipActive]}
                  onPress={() => setFormWallet(w.id)}
                >
                  {w.icon && <Ionicons name={w.icon as any} size={16} color={formWallet === w.id ? '#FFF' : w.color || theme.colors.textSecondary} style={{ marginRight: 4 }} />}
                  <Text style={[styles.walletText, formWallet === w.id && { color: '#FFF' }]}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Catatan (Opsional)" placeholder="Tagihan bulanan" value={formNotes} onChangeText={setFormNotes} />

            <View style={styles.formButtons}>
              <Button title="Batal" variant="ghost" onPress={() => { setShowForm(false); resetForm(); }} style={{ flex: 1 }} />
              <Button title="Simpan" onPress={handleAdd} disabled={!formAmount || !formCategory || !formWallet} loading={loading} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, paddingBottom: 0 },
  title: { ...theme.typography.h2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: 0, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  cardInactive: { opacity: 0.5 },
  salaryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    margin: theme.spacing.md, marginBottom: 0, padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.primary + '40',
  },
  salaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  salaryInfo: { flex: 1 },
  salaryTitle: { ...theme.typography.body, fontWeight: '600' },
  salarySub: { ...theme.typography.caption, marginTop: 2 },
  salaryCta: { ...theme.typography.body, color: theme.colors.primary, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: {},
  cardAmount: { ...theme.typography.h3, marginBottom: 2 },
  cardCategory: { ...theme.typography.bodySmall },
  cardMeta: { flexDirection: 'row', marginTop: theme.spacing.sm, gap: theme.spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...theme.typography.caption },
  notes: { ...theme.typography.bodySmall, marginTop: theme.spacing.sm, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm, gap: theme.spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...theme.typography.caption },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 40 },
  modalScroll: { padding: theme.spacing.md },
  modalTitle: { ...theme.typography.h3, marginBottom: theme.spacing.lg },
  typeSwitcher: { flexDirection: 'row', marginBottom: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md, padding: 4 },
  typeTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: theme.radius.sm },
  typeExpense: { backgroundColor: theme.colors.expense },
  typeIncome: { backgroundColor: theme.colors.income },
  typeTabText: { ...theme.typography.body, color: theme.colors.textSecondary },
  typeTabTextActive: { color: '#FFF', fontWeight: 'bold' },
  fieldLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm },
  freqRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  freqChip: { paddingVertical: 8, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.round, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  freqChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  freqText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  freqTextActive: { color: '#FFF', fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.md, marginHorizontal: -4 },
  catItem: { width: '25%', alignItems: 'center', padding: 4, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: 'transparent', borderRadius: theme.radius.sm },
  catIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  catName: { ...theme.typography.caption, textAlign: 'center' },
  walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  walletChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.round },
  walletChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  walletText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  formButtons: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: 40 },
});

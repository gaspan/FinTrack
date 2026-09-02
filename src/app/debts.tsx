import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { DebtQueries, WalletQueries } from '@/lib/queries';
import { Debt, DebtDirection, DebtSummary, DebtPayment, Wallet } from '@/types';
import { formatRupiah } from '@/utils/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { hapticSuccess } from '@/utils/haptic';

dayjs.locale('id');

type DebtRow = Debt & { wallet_name?: string };

export default function DebtsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();

  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [summary, setSummary] = useState<DebtSummary>({ totalReceivable: 0, totalPayable: 0, net: 0 });
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DebtRow | null>(null);
  const [direction, setDirection] = useState<DebtDirection>('receivable');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [walletId, setWalletId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [bookTx, setBookTx] = useState(true);
  const [saving, setSaving] = useState(false);

  const [payTarget, setPayTarget] = useState<DebtRow | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payments, setPayments] = useState<Record<number, DebtPayment[]>>({});

  const loadData = useCallback(async () => {
    try {
      const q = new DebtQueries(db, bookId);
      const [rows, sum, ws] = await Promise.all([
        q.getAll(filter === 'all'),
        q.getSummary(),
        new WalletQueries(db, bookId).getAll(),
      ]);
      setDebts(rows);
      setSummary(sum);
      setWallets(ws);
      // Drop the history cache so a fresh payment shows up immediately.
      setPayments({});
      setExpandedId(null);
    } catch (e) { console.error(e); }
  }, [db, bookId, filter]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const toggleHistory = async (debtId: number) => {
    if (expandedId === debtId) { setExpandedId(null); return; }
    setExpandedId(debtId);
    if (!payments[debtId]) {
      try {
        const rows = await new DebtQueries(db, bookId).getPayments(debtId);
        setPayments(prev => ({ ...prev, [debtId]: rows }));
      } catch (e) { console.error(e); }
    }
  };

  const resetForm = (dir: DebtDirection = 'receivable') => {
    setEditing(null);
    setDirection(dir);
    setPersonName('');
    setAmount(0);
    setDueDate('');
    setWalletId(wallets.find(w => w.is_primary)?.id ?? wallets[0]?.id);
    setNotes('');
    setBookTx(true);
  };

  const openCreate = (dir: DebtDirection) => { resetForm(dir); setShowForm(true); };

  const openEdit = (d: DebtRow) => {
    setEditing(d);
    setDirection(d.direction);
    setPersonName(d.person_name);
    setAmount(d.amount);
    setDueDate(d.due_date ?? '');
    setWalletId(d.wallet_id ?? undefined);
    setNotes(d.notes ?? '');
    setBookTx(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!personName.trim() || amount <= 0) {
      Alert.alert('Error', 'Nama orang dan nominal harus diisi');
      return;
    }
    if (dueDate && !dayjs(dueDate, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('Error', 'Format tanggal harus YYYY-MM-DD');
      return;
    }
    setSaving(true);
    try {
      const q = new DebtQueries(db, bookId);
      if (editing) {
        await q.update(editing.id, {
          person_name: personName.trim(),
          direction,
          amount,
          due_date: dueDate || null,
          wallet_id: walletId ?? null,
          notes: notes.trim() || null,
        });
      } else {
        await q.create({
          person_name: personName.trim(),
          direction,
          amount,
          due_date: dueDate || null,
          wallet_id: walletId ?? null,
          notes: notes.trim() || null,
        }, bookTx);
      }
      hapticSuccess();
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = (d: DebtRow) => {
    Alert.alert(
      'Hapus Catatan',
      `Hapus ${d.direction === 'receivable' ? 'piutang' : 'utang'} "${d.person_name}"? Transaksi yang sudah tercatat tidak dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try { await new DebtQueries(db, bookId).delete(d.id); loadData(); }
            catch (e) { console.error(e); Alert.alert('Error', 'Gagal menghapus'); }
          },
        },
      ]
    );
  };

  const openPayment = (d: DebtRow) => {
    setPayTarget(d);
    setPayAmount(Math.max(0, d.amount - d.paid_amount));
  };

  const handlePayment = async () => {
    if (!payTarget || payAmount <= 0) return;
    try {
      const res = await new DebtQueries(db, bookId).addPayment(payTarget.id, payAmount, {
        walletId: payTarget.wallet_id,
      });
      hapticSuccess();
      setPayTarget(null);
      loadData();
      Alert.alert(
        res.settled ? 'Lunas' : 'Tercatat',
        res.settled
          ? `${payTarget.person_name} sudah lunas.`
          : `Sisa ${payTarget.direction === 'receivable' ? 'piutang' : 'utang'}: ${formatRupiah(res.remaining)}`
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal mencatat pembayaran');
    }
  };

  const dueLabel = (d: DebtRow) => {
    if (d.is_settled) return { text: 'Lunas', color: theme.colors.success };
    if (!d.due_date) return { text: 'Tanpa jatuh tempo', color: theme.colors.textSecondary };
    const diff = dayjs(d.due_date).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (diff < 0) return { text: `Terlewat ${Math.abs(diff)} hari`, color: theme.colors.danger };
    if (diff === 0) return { text: 'Jatuh tempo hari ini', color: theme.colors.warning };
    if (diff <= 7) return { text: `${diff} hari lagi`, color: theme.colors.warning };
    return { text: dayjs(d.due_date).format('DD MMM YYYY'), color: theme.colors.textSecondary };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Utang & Piutang</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Piutang (masuk)</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                {formatRupiah(summary.totalReceivable)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Utang (keluar)</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>
                {formatRupiah(summary.totalPayable)}
              </Text>
            </View>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Posisi bersih</Text>
            <Text style={[styles.netValue, { color: summary.net >= 0 ? theme.colors.success : theme.colors.danger }]}>
              {summary.net >= 0 ? '+' : ''}{formatRupiah(summary.net)}
            </Text>
          </View>
        </Card>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.success }]} onPress={() => openCreate('receivable')}>
            <Ionicons name="arrow-down-circle-outline" size={18} color={theme.colors.success} />
            <Text style={[styles.actionText, { color: theme.colors.success }]}>Beri Pinjaman</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.danger }]} onPress={() => openCreate('payable')}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.actionText, { color: theme.colors.danger }]}>Saya Berutang</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterBtn, filter === 'open' && styles.filterActive]} onPress={() => setFilter('open')}>
            <Text style={[styles.filterText, filter === 'open' && styles.filterTextActive]}>Belum Lunas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, filter === 'all' && styles.filterActive]} onPress={() => setFilter('all')}>
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Semua</Text>
          </TouchableOpacity>
        </View>

        {debts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Belum ada catatan</Text>
            <Text style={styles.emptyText}>Catat uang yang kamu pinjamkan atau pinjam dari orang lain.</Text>
          </View>
        ) : (
          debts.map(d => {
            const isReceivable = d.direction === 'receivable';
            const accent = isReceivable ? theme.colors.success : theme.colors.danger;
            const remaining = Math.max(0, d.amount - d.paid_amount);
            const pct = d.amount > 0 ? Math.min(100, (d.paid_amount / d.amount) * 100) : 0;
            const due = dueLabel(d);

            return (
              <View key={d.id} style={[styles.item, !!d.is_settled && styles.itemSettled]}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.icon, { backgroundColor: accent + '20' }]}>
                      <Ionicons
                        name={isReceivable ? 'arrow-down-outline' : 'arrow-up-outline'}
                        size={18}
                        color={accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{d.person_name}</Text>
                      <Text style={[styles.itemMeta, { color: due.color }]}>
                        {isReceivable ? 'Piutang' : 'Utang'} · {due.text}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEdit(d)} hitSlop={8}>
                      <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(d)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Text style={[styles.remaining, { color: accent }]}>{formatRupiah(remaining)}</Text>
                  <Text style={styles.ofTotal}>dari {formatRupiah(d.amount)}</Text>
                </View>

                {d.paid_amount > 0 && !d.is_settled && (
                  <ProgressBar progress={pct} color={accent} height={6} />
                )}

                {d.notes ? <Text style={styles.notes}>{d.notes}</Text> : null}

                {d.paid_amount > 0 && (
                  <>
                    <TouchableOpacity style={styles.historyToggle} onPress={() => toggleHistory(d.id)}>
                      <Text style={styles.historyToggleText}>
                        Riwayat pembayaran{payments[d.id] ? ` (${payments[d.id].length})` : ''}
                      </Text>
                      <Ionicons
                        name={expandedId === d.id ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {expandedId === d.id && (payments[d.id] ?? []).map(p => (
                      <View key={p.id} style={styles.historyRow}>
                        <Text style={styles.historyDate}>{dayjs(p.payment_date).format('DD MMM YYYY')}</Text>
                        <Text style={[styles.historyAmount, { color: accent }]}>{formatRupiah(p.amount)}</Text>
                      </View>
                    ))}
                  </>
                )}

                {!d.is_settled && (
                  <TouchableOpacity style={[styles.payBtn, { backgroundColor: accent + '15' }]} onPress={() => openPayment(d)}>
                    <Ionicons name="cash-outline" size={16} color={accent} />
                    <Text style={[styles.payText, { color: accent }]}>
                      {isReceivable ? 'Terima Pembayaran' : 'Bayar'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.hint}>
          Pencatatan utang/piutang otomatis membuat transaksi di dompet terpilih, jadi saldo dan laporan tetap sinkron.
        </Text>
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalPad} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>
            {editing ? 'Edit Catatan' : direction === 'receivable' ? 'Beri Pinjaman' : 'Saya Berutang'}
          </Text>

          <View style={styles.dirRow}>
            <TouchableOpacity
              style={[styles.dirBtn, direction === 'receivable' && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '15' }]}
              onPress={() => setDirection('receivable')}
            >
              <Text style={[styles.dirText, direction === 'receivable' && { color: theme.colors.success, fontWeight: '700' }]}>
                Piutang
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dirBtn, direction === 'payable' && { borderColor: theme.colors.danger, backgroundColor: theme.colors.danger + '15' }]}
              onPress={() => setDirection('payable')}
            >
              <Text style={[styles.dirText, direction === 'payable' && { color: theme.colors.danger, fontWeight: '700' }]}>
                Utang
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label={direction === 'receivable' ? 'Dipinjam oleh' : 'Berutang kepada'}
            placeholder="Nama orang"
            value={personName}
            onChangeText={setPersonName}
          />

          <NumericInput label="Nominal" value={amount} onChangeValue={setAmount} />

          <Input label="Jatuh Tempo (opsional)" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />

          <Text style={styles.label}>Dompet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {wallets.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[styles.chip, walletId === w.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '20' }]}
                onPress={() => setWalletId(w.id)}
              >
                <Ionicons
                  name={(w.icon || 'wallet-outline') as any}
                  size={14}
                  color={walletId === w.id ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.chipLabel, walletId === w.id && { color: theme.colors.primary, fontWeight: '700' }]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input label="Catatan (opsional)" placeholder="Keperluan, kesepakatan..." value={notes} onChangeText={setNotes} />

          {!editing && (
            <TouchableOpacity style={styles.toggleRow} onPress={() => setBookTx(v => !v)}>
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <Text style={styles.toggleTitle}>Catat ke transaksi sekarang</Text>
                <Text style={styles.toggleSub}>
                  {direction === 'receivable'
                    ? 'Uang keluar dari dompet saat memberi pinjaman'
                    : 'Uang masuk ke dompet saat menerima pinjaman'}
                </Text>
              </View>
              <Ionicons name={bookTx ? 'checkbox' : 'square-outline'} size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          <View style={styles.modalActions}>
            <Button title="Batal" variant="ghost" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
            <Button title="Simpan" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={!!payTarget} animationType="fade" transparent onRequestClose={() => setPayTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>
              {payTarget?.direction === 'receivable' ? 'Terima Pembayaran' : 'Bayar Utang'}
            </Text>
            <Text style={styles.sheetSub}>
              {payTarget?.person_name} · sisa {formatRupiah(Math.max(0, (payTarget?.amount ?? 0) - (payTarget?.paid_amount ?? 0)))}
            </Text>
            <NumericInput label="Nominal" value={payAmount} onChangeValue={setPayAmount} />
            <View style={styles.modalActions}>
              <Button title="Batal" variant="ghost" onPress={() => setPayTarget(null)} style={{ flex: 1 }} />
              <Button title="Simpan" onPress={handlePayment} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, flex: 1, textAlign: 'center' },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  summaryCard: { marginBottom: theme.spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1 },
  summaryDivider: { width: 1, height: 36, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.md },
  summaryLabel: { ...theme.typography.caption, marginBottom: 2 },
  summaryValue: { ...theme.typography.h3 },
  netRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: theme.spacing.md, paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  netLabel: { ...theme.typography.bodySmall },
  netValue: { ...theme.typography.body, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: theme.spacing.sm + 2, borderRadius: theme.radius.md,
    borderWidth: 1.5, backgroundColor: theme.colors.surface,
  },
  actionText: { ...theme.typography.bodySmall, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  filterBtn: {
    paddingHorizontal: theme.spacing.md, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border,
  },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { ...theme.typography.caption },
  filterTextActive: { color: theme.colors.textOnPrimary, fontWeight: '700' },
  item: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  itemSettled: { opacity: 0.6 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm,
  },
  itemName: { ...theme.typography.body, fontWeight: '600' },
  itemMeta: { ...theme.typography.caption, marginTop: 1 },
  itemActions: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: theme.spacing.sm, marginBottom: 6 },
  remaining: { ...theme.typography.h3 },
  ofTotal: { ...theme.typography.caption },
  notes: { ...theme.typography.caption, marginTop: 6 },
  historyToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: theme.spacing.sm, paddingVertical: 4,
  },
  historyToggleText: { ...theme.typography.caption, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3,
  },
  historyDate: { ...theme.typography.caption },
  historyAmount: { ...theme.typography.caption, fontWeight: '600' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.sm,
  },
  payText: { ...theme.typography.bodySmall, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  emptyTitle: { ...theme.typography.h3, marginTop: theme.spacing.sm },
  emptyText: { ...theme.typography.bodySmall, textAlign: 'center', marginTop: 4 },
  hint: { ...theme.typography.caption, textAlign: 'center', marginTop: theme.spacing.md },
  modal: { flex: 1, backgroundColor: theme.colors.background },
  modalPad: { padding: theme.spacing.md, paddingTop: 40, paddingBottom: theme.spacing.xl },
  modalTitle: { ...theme.typography.h3, marginBottom: theme.spacing.md },
  dirRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  dirBtn: {
    flex: 1, paddingVertical: theme.spacing.sm + 2, borderRadius: theme.radius.md,
    borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center',
  },
  dirText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  label: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  chipScroll: { marginBottom: theme.spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
    borderRadius: 20, borderWidth: 2, borderColor: theme.colors.border,
  },
  chipLabel: { fontSize: 12, color: theme.colors.textSecondary },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  toggleTitle: { ...theme.typography.body, fontWeight: '500' },
  toggleSub: { ...theme.typography.caption },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg, paddingBottom: theme.spacing.xl,
  },
  sheetSub: { ...theme.typography.bodySmall, marginBottom: theme.spacing.md },
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';

import { theme } from '@/constants/theme';
import { BillReminderQueries, CategoryQueries, WalletQueries } from '@/lib/queries';
import { BillReminder, Category, Wallet } from '@/types';
import { syncBillToCalendar, deleteEventFromCalendar, updateEventInCalendar } from '@/features/notifications/calendarSync';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { formatRupiah } from '@/utils/format';

dayjs.locale('id');

const FREQ_LABELS: Record<string, string> = { one_time: 'Sekali', monthly: 'Bulanan', yearly: 'Tahunan' };

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const [reminders, setReminders] = useState<(BillReminder & { category_name?: string; wallet_name?: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formFrequency, setFormFrequency] = useState<'one_time' | 'monthly' | 'yearly'>('monthly');
  const [formCategory, setFormCategory] = useState<number | null>(null);
  const [formWallet, setFormWallet] = useState<number | null>(null);
  const [formNotes, setFormNotes] = useState('');

  const defaultStyles = useDefaultStyles('light');

  const loadData = useCallback(async () => {
    try {
      const [r, c, w] = await Promise.all([
        new BillReminderQueries(db).getAll(),
        new CategoryQueries(db).getAll(),
        new WalletQueries(db).getAll(),
      ]);
      setReminders(r);
      setCategories(c);
      setWallets(w);
    } catch (e) { console.error(e); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormAmount(0);
    setFormDueDate('');
    setFormFrequency('monthly');
    setFormCategory(null);
    setFormWallet(null);
    setFormNotes('');
  };

  const handleSubmit = async () => {
    if (!formName || formAmount <= 0) return;
    try {
      setLoading(true);
      const q = new BillReminderQueries(db);
      const dueDate = formDueDate || dayjs().add(1, 'month').format('YYYY-MM-DD');

      if (editingId) {
        await q.update(editingId, {
          name: formName, amount: formAmount, due_date: dueDate,
          frequency: formFrequency, category_id: formCategory, wallet_id: formWallet, notes: formNotes || null,
        });
        setShowForm(false);
        resetForm();
        loadData();
        try {
          const bill = await q.getAll().then(b => b.find(r => r.id === editingId));
          if (bill) {
            const oldEventId = bill.calendar_event_id || '';
            const newId = await updateEventInCalendar(oldEventId, { ...bill, created_at: bill.created_at! });
            if (newId && newId !== oldEventId) await q.updateCalendarEventId(editingId, newId);
          }
        } catch {}
      } else {
        const result = await q.create({
          name: formName, amount: formAmount, due_date: dueDate,
          frequency: formFrequency, is_paid: 0, category_id: formCategory, wallet_id: formWallet, notes: formNotes || null,
        });
        setShowForm(false);
        resetForm();
        loadData();
        try {
          const newId = result.lastInsertRowId;
          const newBill = await q.getAll().then(b => b.find(r => r.id === newId));
          if (newBill) {
            const eventId = await syncBillToCalendar(newBill);
            if (eventId) await q.updateCalendarEventId(newId, eventId);
          }
        } catch {}
      }
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan'); }
    finally { setLoading(false); }
  };

  const handleTogglePaid = async (id: number, current: number) => {
    await new BillReminderQueries(db).togglePaid(id, current === 0);
    loadData();
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus', 'Yakin ingin menghapus?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const bill = await new BillReminderQueries(db).getAll().then(b => b.find(r => r.id === id));
        await new BillReminderQueries(db).delete(id);
        if (bill?.calendar_event_id) {
          try { await deleteEventFromCalendar(bill.calendar_event_id); } catch {}
        }
        loadData();
      }},
    ]);
  };

  const daysUntilDue = (date: string) => {
    const diff = dayjs(date).diff(dayjs(), 'day');
    if (diff < 0) return { text: 'Terlewat', color: theme.colors.danger };
    if (diff === 0) return { text: 'Hari ini', color: theme.colors.warning };
    if (diff <= 3) return { text: `${diff} hari lagi`, color: theme.colors.warning };
    return { text: dayjs(date).format('DD MMM'), color: theme.colors.textSecondary };
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pengingat Tagihan</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="alarm-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Belum ada pengingat tagihan</Text>
        </View>
      ) : (
        reminders.map(r => {
          const due = daysUntilDue(r.due_date);
          return (
            <View key={r.id} style={[styles.card, r.is_paid ? styles.cardPaid : null]}>
              <View style={styles.cardContent}>
                <TouchableOpacity onPress={() => handleTogglePaid(r.id, r.is_paid)}>
                  <Ionicons
                    name={r.is_paid ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={r.is_paid ? theme.colors.success : theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{r.name}</Text>
                  <Text style={styles.cardAmount}>
                    {r.is_paid ? 'Lunas' : formatRupiah(r.amount)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.dueText, { color: r.is_paid ? theme.colors.success : due.color }]}>
                    {r.is_paid ? 'Selesai' : due.text}
                  </Text>
                  <Text style={styles.freqText}>{FREQ_LABELS[r.frequency]}</Text>
                </View>
              </View>
              {(r.category_name || r.wallet_name) && (
                <View style={styles.cardMeta}>
                  {r.category_name && <Text style={styles.metaText}>{r.category_name}</Text>}
                  {r.wallet_name && <Text style={styles.metaText}>{r.wallet_name}</Text>}
                </View>
              )}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  setEditingId(r.id);
                  setFormName(r.name);
                  setFormAmount(r.amount);
                  setFormDueDate(r.due_date);
                  setFormFrequency(r.frequency);
                  setFormCategory(r.category_id);
                  setFormWallet(r.wallet_id);
                  setFormNotes(r.notes || '');
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
          );
        })
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{editingId ? 'Edit Pengingat' : 'Tambah Pengingat Tagihan'}</Text>

          <Input label="Nama Tagihan" placeholder="Listrik, Internet, dll" value={formName} onChangeText={setFormName} />
          <NumericInput label="Jumlah" value={formAmount} onChangeValue={setFormAmount} />

          <Text style={styles.fieldLabel}>Frekuensi</Text>
          <View style={styles.freqRow}>
            {(['one_time', 'monthly', 'yearly'] as const).map(f => (
              <TouchableOpacity key={f} style={[styles.freqChip, formFrequency === f && styles.freqChipActive]} onPress={() => setFormFrequency(f)}>
                <Text style={[styles.freqChipText, formFrequency === f && styles.freqTextActive]}>{FREQ_LABELS[f]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Tanggal Jatuh Tempo</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.dateButtonText}>
              {formDueDate ? dayjs(formDueDate).format('DD MMMM YYYY') : 'Pilih tanggal'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Kategori (opsional)</Text>
          <View style={styles.chipRow}>
            {categories.filter(c => c.type === 'expense').map(cat => (
              <TouchableOpacity key={cat.id} style={[styles.chip, formCategory === cat.id && styles.chipActive]} onPress={() => setFormCategory(formCategory === cat.id ? null : cat.id)}>
                <Text style={[styles.chipText, formCategory === cat.id && styles.chipTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Dompet (opsional)</Text>
          <View style={styles.chipRow}>
            {wallets.map(w => (
              <TouchableOpacity key={w.id} style={[styles.chip, formWallet === w.id && styles.chipActive]} onPress={() => setFormWallet(formWallet === w.id ? null : w.id)}>
                <Text style={[styles.chipText, formWallet === w.id && styles.chipTextActive]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Catatan (opsional)" placeholder="No. referensi, dll" value={formNotes} onChangeText={setFormNotes} />

          <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.pickerModal}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Pilih Tanggal</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="single"
                  date={formDueDate ? dayjs(formDueDate).toDate() : dayjs().add(1, 'month').toDate()}
                  onChange={(params: any) => {
                    if (params.date) {
                      setFormDueDate(dayjs(params.date).format('YYYY-MM-DD'));
                      setShowDatePicker(false);
                    }
                  }}
                  styles={{
                    ...defaultStyles,
                    header: { backgroundColor: '#4A90D9', borderBottomWidth: 0 },
                    month_selector_label: { color: '#FFFFFF', fontWeight: '600' },
                    year_selector_label: { color: '#FFFFFF', fontWeight: '600' },
                    button_prev_image: { tintColor: '#FFFFFF' },
                    button_next_image: { tintColor: '#FFFFFF' },
                    weekdays: { backgroundColor: '#F0F4FF' },
                    weekday_label: { color: '#4A90D9', fontWeight: '600' },
                    day: { backgroundColor: '#FFFFFF' },
                    day_label: { color: '#1A1A2E' },
                    selected: { backgroundColor: '#4A90D9', borderRadius: 8 },
                    selected_label: { color: '#FFFFFF', fontWeight: '700' },
                    today: { borderColor: '#4A90D9', borderWidth: 2, borderRadius: 8 },
                    today_label: { color: '#4A90D9', fontWeight: '700' },
                    days: { backgroundColor: '#F8FAFF' },
                  }}
                />
              </View>
            </View>
          </Modal>

          <View style={styles.formButtons}>
            <Button title="Batal" variant="ghost" onPress={() => { setShowForm(false); resetForm(); }} style={{ flex: 1 }} />
            <Button title="Simpan" onPress={handleSubmit} disabled={!formName || formAmount <= 0} loading={loading} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, paddingBottom: 0 },
  title: { ...theme.typography.h2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: 0, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  cardPaid: { opacity: 0.5 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: theme.spacing.md },
  cardName: { ...theme.typography.body, fontWeight: '600' },
  cardAmount: { ...theme.typography.h3 },
  cardRight: { alignItems: 'flex-end' },
  dueText: { ...theme.typography.bodySmall, fontWeight: '600' },
  freqText: { ...theme.typography.caption, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  metaText: { ...theme.typography.caption },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm, gap: theme.spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...theme.typography.caption },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md, paddingTop: 40 },
  modalTitle: { ...theme.typography.h3, marginBottom: theme.spacing.lg },
  fieldLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  freqRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  freqChip: { paddingVertical: 8, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.round, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  freqChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  freqChipText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  freqTextActive: { color: '#FFF', fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  chip: { paddingVertical: 6, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.round, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  chipTextActive: { color: '#FFF' },
  formButtons: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: 40 },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  dateButtonText: { ...theme.typography.body, flex: 1, marginLeft: theme.spacing.sm },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg, paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pickerTitle: { ...theme.typography.h3 },
});

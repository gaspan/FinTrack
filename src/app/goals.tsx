import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { SavingsGoalQueries, WalletQueries } from '@/lib/queries';
import { SavingsGoal, Wallet } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { formatRupiah } from '@/utils/format';

dayjs.locale('id');

const GOAL_ICONS = ['flag-outline', 'rocket-outline', 'star-outline', 'heart-outline', 'card-outline', 'home-outline', 'car-outline', 'airplane-outline', 'book-outline', 'gift-outline'];
const GOAL_COLORS = ['#00D09C', '#6366F1', '#F97316', '#EC4899', '#38BDF8', '#8B5CF6', '#FBBF24', '#FF6B6B', '#34D399', '#177AD5'];

export default function GoalsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fundGoalId, setFundGoalId] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState(0);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState(0);
  const [formDeadline, setFormDeadline] = useState('');
  const [formWallet, setFormWallet] = useState<number | null>(null);
  const [formIcon, setFormIcon] = useState('flag-outline');
  const [formColor, setFormColor] = useState('#00D09C');

  const loadData = useCallback(async () => {
    try {
      const [g, w] = await Promise.all([
        new SavingsGoalQueries(db).getAll(),
        new WalletQueries(db).getAll(),
      ]);
      setGoals(g);
      setWallets(w);
    } catch (e) { console.error(e); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const resetForm = () => {
    setFormName('');
    setFormTarget(0);
    setFormDeadline('');
    setFormWallet(null);
    setFormIcon('flag-outline');
    setFormColor('#00D09C');
  };

  const handleAdd = async () => {
    if (!formName || formTarget <= 0) return;
    try {
      setLoading(true);
      await new SavingsGoalQueries(db).create({
        name: formName, target_amount: formTarget,
        deadline: formDeadline || null, wallet_id: formWallet,
        icon: formIcon, color: formColor,
      });
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan'); }
    finally { setLoading(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Target', 'Yakin ingin menghapus target ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        await new SavingsGoalQueries(db).delete(id);
        loadData();
      }},
    ]);
  };

  const handleAddFunds = async () => {
    if (!fundGoalId || fundAmount <= 0) return;
    try {
      const goals = await new SavingsGoalQueries(db).getAll();
      const goal = goals.find(g => g.id === fundGoalId);
      if (!goal) return;

      await new SavingsGoalQueries(db).addFunds(goal.id, fundAmount);
      if (goal.wallet_id) {
        await db.runAsync('UPDATE wallets SET balance = balance - ? WHERE id = ?', [fundAmount, goal.wallet_id]);
      }
      const newTotal = goal.current_amount + fundAmount;
      if (newTotal >= goal.target_amount) {
        await new SavingsGoalQueries(db).markCompleted(goal.id, true);
      }
      Alert.alert('Berhasil', `Dana sebesar ${formatRupiah(fundAmount)} berhasil ditambahkan.`);
      setFundGoalId(null);
      setFundAmount(0);
      loadData();
    } catch (e) { Alert.alert('Error', 'Gagal menambah dana'); }
  };

  const progress = (current: number, target: number) => Math.min((current / target) * 100, 100);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Target Menabung</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flag-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Belum ada target menabung</Text>
        </View>
      ) : (
        goals.map(g => {
          const pct = progress(g.current_amount, g.target_amount);
          const isComplete = g.is_completed === 1 || pct >= 100;
          const daysLeft = g.deadline ? dayjs(g.deadline).diff(dayjs(), 'day') : null;
          return (
            <View key={g.id} style={[styles.card, isComplete && styles.cardComplete]}>
              <View style={styles.cardHeader}>
                <View style={[styles.goalIcon, { backgroundColor: g.color + '20' }]}>
                  <Ionicons name={(g.icon || 'flag-outline') as any} size={24} color={g.color} />
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  <Text style={styles.goalTarget}>Target: {formatRupiah(g.target_amount)}</Text>
                </View>
                {isComplete && <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />}
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: g.color }]} />
                </View>
                <Text style={styles.progressText}>{pct.toFixed(0)}%</Text>
              </View>

              <Text style={styles.collectedText}>
                Terkumpul: <Text style={{ fontWeight: 'bold' }}>{formatRupiah(g.current_amount)}</Text>
              </Text>

              {daysLeft !== null && !isComplete && (
                <Text style={styles.deadlineText}>
                  {daysLeft < 0 ? 'Terlewat' : `${daysLeft} hari lagi`} ({dayjs(g.deadline).format('DD MMM YYYY')})
                </Text>
              )}

              {g.wallet_id && (
                <Text style={styles.walletText}>
                  Dompet: {wallets.find(w => w.id === g.wallet_id)?.name || '-'}
                </Text>
              )}

              <View style={styles.cardActions}>
                {!isComplete && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setFundGoalId(g.id); setFundAmount(0); }}>
                    <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.actionText, { color: theme.colors.primary }]}>Tambah Dana</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(g.id)}>
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
          <Text style={styles.modalTitle}>Tambah Target Menabung</Text>

          <Input label="Nama Target" placeholder="Contoh: Beli Laptop" value={formName} onChangeText={setFormName} />

          <NumericInput label="Jumlah Target" value={formTarget} onChangeValue={setFormTarget} />

          <Input label="Deadline (YYYY-MM-DD, opsional)" placeholder="2026-12-31" value={formDeadline} onChangeText={setFormDeadline} />

          <Text style={styles.fieldLabel}>Dompet (opsional)</Text>
          <View style={styles.walletRow}>
            <TouchableOpacity style={[styles.walletChip, formWallet === null && styles.walletChipActive]} onPress={() => setFormWallet(null)}>
              <Text style={[styles.chipWalletText, formWallet === null && { color: '#FFF' }]}>Tidak ada</Text>
            </TouchableOpacity>
            {wallets.map(w => (
              <TouchableOpacity key={w.id} style={[styles.walletChip, formWallet === w.id && styles.walletChipActive]} onPress={() => setFormWallet(w.id)}>
                {w.icon && <Ionicons name={w.icon as any} size={16} color={formWallet === w.id ? '#FFF' : w.color || theme.colors.textSecondary} style={{ marginRight: 4 }} />}
                <Text style={[styles.chipWalletText, formWallet === w.id && { color: '#FFF' }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Ikon</Text>
          <View style={styles.iconRow}>
            {GOAL_ICONS.map(icon => (
              <TouchableOpacity key={icon} style={[styles.iconItem, formIcon === icon && { borderColor: formColor }]} onPress={() => setFormIcon(icon)}>
                <Ionicons name={icon as any} size={24} color={formIcon === icon ? formColor : theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Warna</Text>
          <View style={styles.colorRow}>
            {GOAL_COLORS.map(color => (
              <TouchableOpacity key={color} style={[styles.colorItem, { backgroundColor: color }, formColor === color && styles.colorActive]} onPress={() => setFormColor(color)} />
            ))}
          </View>

          <View style={styles.formButtons}>
            <Button title="Batal" variant="ghost" onPress={() => { setShowForm(false); resetForm(); }} style={{ flex: 1 }} />
            <Button title="Simpan" onPress={handleAdd} disabled={!formName || formTarget <= 0} loading={loading} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Modal>

      {/* Fund Modal */}
      <Modal visible={fundGoalId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFundGoalId(null)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Tambah Dana</Text>
          <NumericInput label="Jumlah dana" value={fundAmount} onChangeValue={setFundAmount} />
          <View style={styles.formButtons}>
            <Button title="Batal" variant="ghost" onPress={() => { setFundGoalId(null); setFundAmount(0); }} style={{ flex: 1 }} />
            <Button title="Tambah" onPress={handleAddFunds} disabled={fundAmount <= 0} style={{ flex: 1 }} />
          </View>
        </View>
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
  card: {
    backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginBottom: 0,
    padding: theme.spacing.md, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cardComplete: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  goalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  goalInfo: { flex: 1 },
  goalName: { ...theme.typography.body, fontWeight: '600' },
  goalTarget: { ...theme.typography.bodySmall },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md, gap: theme.spacing.sm },
  progressBg: { flex: 1, height: 8, backgroundColor: theme.colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { ...theme.typography.caption, fontWeight: 'bold', minWidth: 36, textAlign: 'right' },
  collectedText: { ...theme.typography.caption, marginTop: 4 },
  deadlineText: { ...theme.typography.caption, color: theme.colors.warning, marginTop: 2 },
  walletText: { ...theme.typography.caption, marginTop: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm, gap: theme.spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...theme.typography.caption },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md, paddingTop: 40 },
  modalTitle: { ...theme.typography.h3, marginBottom: theme.spacing.lg },
  fieldLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  walletChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.round },
  walletChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipWalletText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  iconItem: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  colorItem: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorActive: { borderColor: '#FFF' },
  formButtons: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: 40 },
});

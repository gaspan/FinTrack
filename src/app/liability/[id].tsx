import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { NetWorthQueries } from '@/lib/queries';
import { Liability } from '@/types';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { Button } from '@/components/ui/Button';
import { IconPicker, ColorPicker } from '@/components/ui/IconPicker';

const LIABILITY_TYPES = [
  { key: 'loan' as const, label: 'Pinjaman', icon: 'business-outline' },
  { key: 'credit_card' as const, label: 'Kartu Kredit', icon: 'card-outline' },
  { key: 'debt' as const, label: 'Utang', icon: 'cash-outline' },
  { key: 'other' as const, label: 'Lainnya', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function LiabilityFormPage() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const queries = new NetWorthQueries(db);

  const [name, setName] = useState('');
  const [type, setType] = useState<Liability['type']>('loan');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [originalAmount, setOriginalAmount] = useState<number | undefined>();
  const [interestRate, setInterestRate] = useState<number | undefined>();
  const [monthlyPayment, setMonthlyPayment] = useState<number | undefined>();
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState('card-outline');
  const [color, setColor] = useState('#EF4444');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isNew && id) {
      queries.getLiabilityById(Number(id)).then((liab) => {
        if (liab) {
          setName(liab.name);
          setType(liab.type);
          setCurrentBalance(liab.current_balance);
          setOriginalAmount(liab.original_amount);
          setInterestRate(liab.interest_rate);
          setMonthlyPayment(liab.monthly_payment);
          setDueDate(liab.due_date || '');
          setNotes(liab.notes || '');
          setIcon(liab.icon);
          setColor(liab.color);
        }
        setPageLoading(false);
      });
    } else {
      setPageLoading(false);
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama harus diisi');
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: name.trim(), type, current_balance: currentBalance,
        original_amount: originalAmount, interest_rate: interestRate,
        monthly_payment: monthlyPayment, due_date: dueDate || undefined,
        notes: notes || undefined, icon, color,
      };
      if (isNew) {
        await queries.addLiability(data);
      } else {
        await queries.updateLiability(Number(id), data);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? 'Tambah Utang' : 'Edit Utang'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Input label="Nama" placeholder="Misal: KPR BNI, CC BCA" value={name} onChangeText={setName} />

        <Text style={styles.sectionLabel}>Tipe</Text>
        <View style={styles.typeRow}>
          {LIABILITY_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, type === t.key && { borderColor: color, backgroundColor: color + '15' }]}
              onPress={() => { setType(t.key); setIcon(t.icon); }}
            >
              <Ionicons name={t.icon as any} size={20} color={type === t.key ? color : theme.colors.textSecondary} />
              <Text style={[styles.typeLabel, type === t.key && { color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <NumericInput label="Saldo Utang Saat Ini" value={currentBalance} onChangeValue={setCurrentBalance} />
        <NumericInput label="Jumlah Awal (opsional)" value={originalAmount ?? 0} onChangeValue={(v) => setOriginalAmount(v || undefined)} />
        <NumericInput label="Bunga % (opsional)" value={interestRate ?? 0} onChangeValue={(v) => setInterestRate(v || undefined)} />
        <NumericInput label="Cicilan/Bulan (opsional)" value={monthlyPayment ?? 0} onChangeValue={(v) => setMonthlyPayment(v || undefined)} />
        <Input label="Jatuh Tempo (opsional)" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />
        <Input label="Catatan (opsional)" placeholder="Catatan tambahan" value={notes} onChangeText={setNotes} multiline />

        <IconPicker value={icon} onChange={setIcon} color={color} />
        <ColorPicker value={color} onChange={setColor} />

        <View style={styles.buttonRow}>
          <Button title="Batal" onPress={() => router.back()} variant="secondary" style={{ flex: 1 }} />
          <Button title="Simpan" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, flex: 1, textAlign: 'center' },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  sectionLabel: { ...theme.typography.subtitle, marginBottom: theme.spacing.sm },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md },
  typeBtn: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: theme.colors.border,
    alignItems: 'center', gap: 4,
  },
  typeLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.lg },
});
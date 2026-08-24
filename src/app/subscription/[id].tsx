import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { SubscriptionQueries, WalletQueries, CategoryQueries } from '@/lib/queries';
import { Subscription, Wallet, Category } from '@/types';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { Button } from '@/components/ui/Button';
import { IconPicker, ColorPicker } from '@/components/ui/IconPicker';

const SUB_CATEGORIES = [
  { key: 'streaming' as const, label: 'Streaming', icon: 'play-outline' },
  { key: 'software' as const, label: 'Software', icon: 'laptop-outline' },
  { key: 'fitness' as const, label: 'Fitness', icon: 'fitness-outline' },
  { key: 'news' as const, label: 'News', icon: 'newspaper-outline' },
  { key: 'other' as const, label: 'Lainnya', icon: 'ellipsis-horizontal-circle-outline' },
];

const CYCLE_OPTIONS = [
  { key: 'monthly' as const, label: 'Bulanan' },
  { key: 'quarterly' as const, label: '3 Bulanan' },
  { key: 'yearly' as const, label: 'Tahunan' },
];

export default function SubscriptionFormPage() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const queries = new SubscriptionQueries(db);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Subscription['category']>('streaming');
  const [amount, setAmount] = useState(0);
  const [billingCycle, setBillingCycle] = useState<Subscription['billing_cycle']>('monthly');
  const [startDate, setStartDate] = useState('');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [icon, setIcon] = useState('card-outline');
  const [color, setColor] = useState('#8B5CF6');
  const [walletId, setWalletId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [autoCreate, setAutoCreate] = useState(true);
  const [remind, setRemind] = useState(true);
  const [notes, setNotes] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [ws, cs] = await Promise.all([
        new WalletQueries(db).getAll(),
        new CategoryQueries(db).getByType('expense'),
      ]);
      if (!alive) return;
      setWallets(ws);
      setCategories(cs);

      if (!isNew && id) {
        const sub = await queries.getById(Number(id));
        if (!alive) return;
        if (sub) {
          setName(sub.name); setCategory(sub.category);
          setAmount(sub.amount); setBillingCycle(sub.billing_cycle);
          setStartDate(sub.start_date); setNextBillingDate(sub.next_billing_date);
          setIcon(sub.icon); setColor(sub.color);
          setWalletId(sub.wallet_id ?? undefined);
          setCategoryId(sub.category_id ?? undefined);
          setAutoCreate(!!sub.auto_create);
          setRemind(!!sub.remind);
          setNotes(sub.notes ?? '');
        }
      } else {
        // Default to the primary wallet so auto-create works without extra taps.
        setWalletId(ws.find(w => w.is_primary)?.id ?? ws[0]?.id);
      }
      setPageLoading(false);
    })().catch(() => { if (alive) setPageLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const handleSave = async () => {
    if (!name.trim() || amount <= 0) {
      Alert.alert('Error', 'Nama dan nominal harus diisi');
      return;
    }
    setLoading(true);
    try {
      const data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'> = {
        name: name.trim(), category, amount, billing_cycle: billingCycle,
        start_date: startDate || new Date().toISOString().slice(0, 10),
        next_billing_date: nextBillingDate || new Date().toISOString().slice(0, 10),
        wallet_id: walletId, category_id: categoryId,
        icon, color, is_active: 1,
        auto_create: autoCreate ? 1 : 0,
        remind: remind ? 1 : 0,
        notes: notes.trim() || undefined,
      };
      if (isNew) {
        await queries.add(data);
      } else {
        await queries.update(Number(id), data);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? 'Tambah Langganan' : 'Edit Langganan'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Input label="Nama" placeholder="Netflix Premium, Spotify..." value={name} onChangeText={setName} />

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.typeRow}>
          {SUB_CATEGORIES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, category === t.key && { borderColor: color, backgroundColor: color + '15' }]}
              onPress={() => { setCategory(t.key); setIcon(t.icon); }}
            >
              <Ionicons name={t.icon as any} size={20} color={category === t.key ? color : theme.colors.textSecondary} />
              <Text style={[styles.typeLabel, category === t.key && { color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <NumericInput label="Nominal" value={amount} onChangeValue={setAmount} />

        <Text style={styles.label}>Siklus Tagihan</Text>
        <View style={styles.cycleRow}>
          {CYCLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.cycleBtn, billingCycle === opt.key && { backgroundColor: color + '20', borderColor: color }]}
              onPress={() => setBillingCycle(opt.key)}
            >
              <Text style={[styles.cycleLabel, billingCycle === opt.key && { color, fontWeight: '700' }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Tanggal Mulai" placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
        <Input label="Tagihan Berikutnya" placeholder="YYYY-MM-DD" value={nextBillingDate} onChangeText={setNextBillingDate} />

        <Text style={styles.label}>Dibayar dari Dompet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {wallets.map(w => (
            <TouchableOpacity
              key={w.id}
              style={[styles.chip, walletId === w.id && { backgroundColor: color + '20', borderColor: color }]}
              onPress={() => setWalletId(w.id)}
            >
              <Ionicons
                name={(w.icon || 'wallet-outline') as any}
                size={14}
                color={walletId === w.id ? color : theme.colors.textSecondary}
              />
              <Text style={[styles.chipLabel, walletId === w.id && { color, fontWeight: '700' }]}>{w.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Kategori Pengeluaran</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, categoryId === c.id && { backgroundColor: color + '20', borderColor: color }]}
              onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
            >
              <Ionicons
                name={c.icon as any}
                size={14}
                color={categoryId === c.id ? color : theme.colors.textSecondary}
              />
              <Text style={[styles.chipLabel, categoryId === c.id && { color, fontWeight: '700' }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.toggleRow} onPress={() => setAutoCreate(v => !v)}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Catat transaksi otomatis</Text>
            <Text style={styles.toggleSub}>Buat pengeluaran saat tagihan jatuh tempo</Text>
          </View>
          <Ionicons name={autoCreate ? 'checkbox' : 'square-outline'} size={24} color={color} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleRow} onPress={() => setRemind(v => !v)}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Ingatkan H-1</Text>
            <Text style={styles.toggleSub}>Notifikasi sehari sebelum perpanjangan</Text>
          </View>
          <Ionicons name={remind ? 'checkbox' : 'square-outline'} size={24} color={color} />
        </TouchableOpacity>

        <Input label="Catatan (opsional)" placeholder="Paket keluarga, dibagi 4 orang..." value={notes} onChangeText={setNotes} />

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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, flex: 1, textAlign: 'center' },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  label: { ...theme.typography.subtitle, marginBottom: theme.spacing.sm },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', gap: 4 },
  typeLabel: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },
  cycleRow: { flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md },
  cycleBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center' },
  cycleLabel: { fontSize: 13, color: theme.colors.textSecondary },
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
  toggleText: { flex: 1, paddingRight: theme.spacing.md },
  toggleTitle: { ...theme.typography.body, fontWeight: '500' },
  toggleSub: { ...theme.typography.caption },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.lg },
});
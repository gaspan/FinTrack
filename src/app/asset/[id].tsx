import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { NetWorthQueries } from '@/lib/queries';
import { Asset } from '@/types';
import { Input } from '@/components/ui/Input';
import { NumericInput } from '@/components/ui/NumericInput';
import { Button } from '@/components/ui/Button';
import { IconPicker, ColorPicker } from '@/components/ui/IconPicker';

const ASSET_TYPES = [
  { key: 'investment' as const, label: 'Investasi', icon: 'trending-up-outline' },
  { key: 'property' as const, label: 'Properti', icon: 'home-outline' },
  { key: 'other' as const, label: 'Lainnya', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function AssetFormPage() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const queries = new NetWorthQueries(db);

  const [name, setName] = useState('');
  const [type, setType] = useState<Asset['type']>('investment');
  const [currentValue, setCurrentValue] = useState(0);
  const [initialValue, setInitialValue] = useState<number | undefined>();
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState('trending-up-outline');
  const [color, setColor] = useState('#6366F1');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isNew && id) {
      queries.getAssetById(Number(id)).then((asset) => {
        if (asset) {
          setName(asset.name);
          setType(asset.type);
          setCurrentValue(asset.current_value);
          setInitialValue(asset.initial_value);
          setPurchaseDate(asset.purchase_date || '');
          setNotes(asset.notes || '');
          setIcon(asset.icon);
          setColor(asset.color);
        }
        setPageLoading(false);
      });
    } else {
      setPageLoading(false);
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama aset harus diisi');
      return;
    }
    if (currentValue <= 0) {
      Alert.alert('Error', 'Nilai aset harus lebih dari 0');
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: name.trim(), type, current_value: currentValue,
        initial_value: initialValue, purchase_date: purchaseDate || undefined,
        notes: notes || undefined, icon, color,
      };
      if (isNew) {
        await queries.addAsset(data);
      } else {
        await queries.updateAsset(Number(id), data);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Gagal menyimpan aset');
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
        <Text style={styles.headerTitle}>{isNew ? 'Tambah Aset' : 'Edit Aset'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Input label="Nama Aset" placeholder="Misal: Rumah Bogor, Saham BBCA" value={name} onChangeText={setName} />

        <Text style={styles.sectionLabel}>Tipe Aset</Text>
        <View style={styles.typeRow}>
          {ASSET_TYPES.map((t) => (
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

        <NumericInput label="Nilai Saat Ini" value={currentValue} onChangeValue={setCurrentValue} />
        <NumericInput label="Nilai Awal (opsional)" value={initialValue ?? 0} onChangeValue={(v) => setInitialValue(v || undefined)} />
        <Input label="Tanggal Beli (opsional)" placeholder="YYYY-MM-DD" value={purchaseDate} onChangeText={setPurchaseDate} />
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
    alignItems: 'center', gap: 6,
  },
  typeLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.lg },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { TransactionType } from '@/types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CategoryFormProps {
  initialData?: { name: string; type: TransactionType; icon: string; color: string };
  onSubmit: (data: { name: string; type: TransactionType; icon: string; color: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const AVAILABLE_ICONS = [
  'cash-outline', 'card-outline', 'wallet-outline', 'cart-outline',
  'restaurant-outline', 'car-outline', 'game-controller-outline',
  'color-wand-outline', 'laptop-outline', 'briefcase-outline',
  'trending-up-outline', 'home-outline', 'medkit-outline', 'school-outline',
  'airplane-outline', 'fitness-outline', 'shirt-outline', 'ellipsis-horizontal-circle-outline',
];

const AVAILABLE_COLORS = [
  '#00D09C', '#00B4D8', '#177AD5', '#6366F1', '#8B5CF6',
  '#FF6B6B', '#F97316', '#EAB308', '#EC4899', '#38BDF8', '#9CA3AF',
];

export const CategoryForm: React.FC<CategoryFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [icon, setIcon] = useState(initialData?.icon || AVAILABLE_ICONS[0]);
  const [color, setColor] = useState(initialData?.color || AVAILABLE_COLORS[0]);

  const isValid = name.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ name: name.trim(), type, icon, color });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{initialData ? 'Edit Kategori' : 'Tambah Kategori Baru'}</Text>

      <Input
        label="Nama Kategori"
        placeholder="Misal: Belanja, Listrik, dll"
        value={name}
        onChangeText={setName}
      />

      {!initialData && (
        <>
          <Text style={styles.sectionLabel}>Tipe</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeChip, type === 'expense' && styles.typeActive]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Pengeluaran</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, type === 'income' && styles.typeActiveIncome]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Pemasukan</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>Pilih Ikon</Text>
      <View style={styles.iconGrid}>
        {AVAILABLE_ICONS.map((i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            style={[styles.iconButton, icon === i && { borderColor: color }]}
            onPress={() => setIcon(i)}
          >
            <Ionicons name={i as any} size={22} color={icon === i ? color : theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Pilih Warna</Text>
      <View style={styles.colorRow}>
        {AVAILABLE_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            activeOpacity={0.7}
            style={[styles.colorButton, { backgroundColor: c }, color === c && styles.colorButtonActive]}
            onPress={() => setColor(c)}
          >
            {color === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Button title="Batal" variant="ghost" onPress={onCancel} style={styles.button} />
        <Button title="Simpan" onPress={handleSubmit} disabled={!isValid} loading={loading} style={styles.button} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
  title: { ...theme.typography.h3, marginBottom: theme.spacing.lg },
  sectionLabel: {
    ...theme.typography.bodySmall, color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm,
  },
  typeRow: { flexDirection: 'row', marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  typeChip: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
  },
  typeActive: { backgroundColor: theme.colors.expense, borderColor: theme.colors.expense },
  typeActiveIncome: { backgroundColor: theme.colors.income, borderColor: theme.colors.income },
  typeText: { ...theme.typography.body, color: theme.colors.textSecondary },
  typeTextActive: { color: '#FFF', fontWeight: 'bold' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.md },
  iconButton: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'transparent',
    backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.xs, marginBottom: theme.spacing.xs,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.xl },
  colorButton: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.sm, marginBottom: theme.spacing.sm,
  },
  colorButtonActive: { borderWidth: 2, borderColor: '#FFF' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.md },
  button: { marginLeft: theme.spacing.sm },
});

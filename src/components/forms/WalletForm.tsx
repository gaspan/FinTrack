import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { Input } from '../ui/Input';
import { NumericInput } from '../ui/NumericInput';
import { Button } from '../ui/Button';

interface WalletFormProps {
  initialData?: { name: string; balance: number; icon: string; color: string };
  onSubmit: (data: { name: string; balance: number; icon: string; color: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const AVAILABLE_ICONS = ['cash-outline', 'card-outline', 'wallet-outline', 'phone-portrait-outline', 'briefcase-outline'];
const AVAILABLE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

export const WalletForm: React.FC<WalletFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [balance, setBalance] = useState(initialData?.balance || 0);
  const [icon, setIcon] = useState(initialData?.icon || AVAILABLE_ICONS[0]);
  const [color, setColor] = useState(initialData?.color || AVAILABLE_COLORS[0]);

  const isValid = name.trim().length > 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{initialData ? 'Edit Dompet' : 'Tambah Dompet Baru'}</Text>
      
      <Input
        label="Nama Dompet"
        placeholder="Misal: BCA, OVO, Cash"
        value={name}
        onChangeText={setName}
      />
      
      <NumericInput
        label="Saldo Awal"
        value={balance}
        onChangeValue={setBalance}
      />
      
      <Text style={styles.sectionLabel}>Pilih Ikon</Text>
      <View style={styles.iconRow}>
        {AVAILABLE_ICONS.map((i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            style={[styles.iconButton, icon === i && { borderColor: color }]}
            onPress={() => setIcon(i)}
          >
            <Ionicons name={i as any} size={24} color={icon === i ? color : theme.colors.textSecondary} />
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
        <Button 
          title="Batal" 
          variant="ghost" 
          onPress={onCancel} 
          style={styles.button}
        />
        <Button 
          title="Simpan" 
          onPress={() => onSubmit({ name, balance, icon, color })} 
          disabled={!isValid}
          loading={loading}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  colorButtonActive: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    marginLeft: theme.spacing.sm,
  }
});

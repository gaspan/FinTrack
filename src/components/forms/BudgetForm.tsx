import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { Category } from '@/types';
import { NumericInput } from '../ui/NumericInput';
import { Button } from '../ui/Button';

interface BudgetFormProps {
  category: Category;
  initialLimit: number;
  initialRolloverEnabled?: boolean;
  onSubmit: (limit: number, rolloverEnabled: boolean) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  category,
  initialLimit,
  initialRolloverEnabled = false,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [limit, setLimit] = useState(initialLimit);
  const [rolloverEnabled, setRolloverEnabled] = useState(initialRolloverEnabled);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atur Anggaran: {category.name}</Text>
      <Text style={styles.subtitle}>Tentukan batas maksimal pengeluaran bulan ini.</Text>
      
      <NumericInput
        label="Batas Anggaran (Rp)"
        value={limit}
        onChangeValue={setLimit}
        autoFocus
      />

      <View style={styles.rolloverRow}>
        <View style={styles.rolloverInfo}>
          <Text style={styles.rolloverTitle}>Teruskan sisa ke bulan depan</Text>
          <Text style={styles.rolloverSub}>Sisa anggaran yang tidak terpakai otomatis ditambahkan bulan berikutnya</Text>
        </View>
        <Switch
          value={rolloverEnabled}
          onValueChange={setRolloverEnabled}
          trackColor={{ false: theme.colors.track, true: theme.colors.primary + '66' }}
          thumbColor={rolloverEnabled ? theme.colors.primary : theme.colors.textMuted}
        />
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
          onPress={() => onSubmit(limit, rolloverEnabled)} 
          disabled={limit <= 0}
          loading={loading}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    marginBottom: theme.spacing.lg,
  },
  rolloverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rolloverInfo: { flex: 1 },
  rolloverTitle: { ...theme.typography.body, fontWeight: '600' },
  rolloverSub: { ...theme.typography.caption, marginTop: 2 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
  },
  button: {
    marginLeft: theme.spacing.sm,
  }
});

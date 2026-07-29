import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { Category } from '@/types';
import { NumericInput } from '../ui/NumericInput';
import { Button } from '../ui/Button';

interface BudgetFormProps {
  category: Category;
  initialLimit: number;
  onSubmit: (limit: number) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  category,
  initialLimit,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [limit, setLimit] = useState(initialLimit);

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
      
      <View style={styles.buttonRow}>
        <Button 
          title="Batal" 
          variant="ghost" 
          onPress={onCancel} 
          style={styles.button}
        />
        <Button 
          title="Simpan" 
          onPress={() => onSubmit(limit)} 
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
  },
  button: {
    marginLeft: theme.spacing.sm,
  }
});

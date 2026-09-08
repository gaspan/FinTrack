import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import type { ChartDataPoint } from '@/types';

/** Urutkan terbesar dulu, ambil N teratas. */
export const takeTopBars = (data: ChartDataPoint[], n = 6): ChartDataPoint[] =>
  [...data].sort((a, b) => b.value - a.value).slice(0, Math.max(1, n));

interface MonthBarsCardProps {
  expense: ChartDataPoint[];
  income: ChartDataPoint[];
}

export const MonthBarsCard: React.FC<MonthBarsCardProps> = ({ expense, income }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const topExpense = useMemo(() => takeTopBars(expense), [expense]);
  const topIncome = useMemo(() => takeTopBars(income), [income]);

  if (expense.length === 0 && income.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.blockTitle}>Pengeluaran per kategori</Text>
      {topExpense.length > 0 ? (
        <CategoryBarChart data={topExpense} />
      ) : (
        <Text style={styles.emptyText}>Belum ada pengeluaran bulan ini.</Text>
      )}
      <View style={styles.divider} />
      <Text style={styles.blockTitle}>Pemasukan per kategori</Text>
      {topIncome.length > 0 ? (
        <CategoryBarChart data={topIncome} />
      ) : (
        <Text style={styles.emptyText}>Belum ada pemasukan bulan ini.</Text>
      )}
    </Card>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  blockTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  emptyText: { ...theme.typography.bodySmall, marginBottom: theme.spacing.sm },
});

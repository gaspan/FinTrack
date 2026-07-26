import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { theme } from '@/constants/theme';
import { formatRupiahShort } from '@/utils/format';
import { EmptyState } from '../ui/EmptyState';

interface MonthlyTrendChartProps {
  data: { month: string; income: number; expense: number }[];
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState title="Belum ada data" message="Transaksi akan muncul di sini" icon="trending-up-outline" />
      </View>
    );
  }

  const barData = data.map(d => {
    const total = Math.max(d.income, d.expense, 1);
    return {
      value: total,
      label: d.month.slice(0, 3),
      frontColor: d.income >= d.expense ? theme.colors.income : theme.colors.expense,
      topLabelComponent: () => (
        <Text style={styles.barLabel}>{formatRupiahShort(total)}</Text>
      ),
    };
  });

  return (
    <View style={styles.container}>
      <BarChart
        data={barData}
        height={160}
        barWidth={20}
        spacing={12}
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
        noOfSections={3}
        isAnimated
        animationDuration={400}
        renderTooltip={(item: any) => (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{formatRupiahShort(item.value)}</Text>
          </View>
        )}
      />
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.income }]} />
          <Text style={styles.legendText}>Pemasukan {'>'} Pengeluaran</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.expense }]} />
          <Text style={styles.legendText}>Pengeluaran {'>'} Pemasukan</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  emptyContainer: { height: 180, justifyContent: 'center' },
  barLabel: { ...theme.typography.caption, fontSize: 9, color: theme.colors.textSecondary, marginBottom: 4 },
  tooltip: { backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tooltipText: { ...theme.typography.caption, color: theme.colors.textPrimary },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...theme.typography.caption, fontSize: 9 },
});

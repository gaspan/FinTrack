import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { useTheme, type Theme } from '@/constants/theme';
import { formatRupiahShort } from '@/utils/format';
import { EmptyState } from '../ui/EmptyState';

interface MonthlyTrendChartProps {
  data: { month: string; income: number; expense: number }[];
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState title="Belum ada data" message="Transaksi akan muncul di sini" icon="trending-up-outline" />
      </View>
    );
  }

  const barData = data.flatMap(d => {
    const label = dayjs(d.month).format('MMM YY');
    return [
      {
        value: d.income,
        label,
        spacing: 2,
        labelWidth: 46,
        frontColor: theme.colors.income,
      },
      {
        value: d.expense,
        frontColor: theme.colors.expense,
      },
    ];
  });

  return (
    <View style={styles.container}>
      <BarChart
        data={barData}
        height={160}
        barWidth={11}
        spacing={18}
        initialSpacing={10}
        barBorderTopLeftRadius={3}
        barBorderTopRightRadius={3}
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
        formatYLabel={(v: string) => formatRupiahShort(Number(v))}
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
          <Text style={styles.legendText}>Pemasukan</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.expense }]} />
          <Text style={styles.legendText}>Pengeluaran</Text>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
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

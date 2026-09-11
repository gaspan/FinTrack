import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { useTheme, type Theme } from '@/constants/theme';
import { formatRupiahShort } from '@/utils/format';
import { EmptyState } from '../ui/EmptyState';

interface MonthlyComboDataPoint {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyTrendComboChartProps {
  data: MonthlyComboDataPoint[];
}

/**
 * Monthly Trend Combo Chart
 * 
 * Enhanced from grouped bar chart to include:
 * 1. Grouped bars showing income (green) vs expense (red) for each month
 * 2. Overlay line graph showing Net Savings (Income - Expense) trend
 * 
 * This gives immediate view of financial growth and spending efficiency.
 */
export const MonthlyTrendComboChart: React.FC<MonthlyTrendComboChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          title="Belum ada data"
          message="Transaksi akan muncul di sini"
          icon="trending-up-outline"
        />
      </View>
    );
  }

  // Calculate net savings (income - expense) for each month
  const netSavingsData = data.map(d => ({
    month: d.month,
    netSavings: d.income - d.expense,
  }));

  // Determine if overall trend is positive
  const avgNetSavings =
    netSavingsData.reduce((sum, d) => sum + d.netSavings, 0) / netSavingsData.length;
  const trendIsPositive = avgNetSavings >= 0;
  const lineColor = trendIsPositive ? theme.colors.income : theme.colors.expense;

  // Prepare bar chart data (grouped: income + expense per month)
  const barData = data.flatMap((d, idx) => {
    const label = dayjs(d.month).format('MMM YY');
    return [
      {
        value: d.income,
        label: idx % 2 === 0 ? label : '', // Show label every other month to avoid crowding
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

  // Prepare line data for net savings overlay
  const lineData = netSavingsData.map((d, idx) => ({
    value: d.netSavings,
    label: idx % 2 === 0 ? dayjs(d.month).format('MMM') : '',
    labelWidth: 40,
  }));

  // Calculate min and max for scaling
  const maxIncome = Math.max(...data.map(d => d.income));
  const maxExpense = Math.max(...data.map(d => d.expense));
  const barChartMax = Math.max(maxIncome, maxExpense) * 1.1;

  return (
    <View style={styles.container}>
      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: `${lineColor}15` }]}>
        <Text style={[styles.infoText, { color: lineColor }]}>
          {trendIsPositive ? '📈 Tabungan' : '📉 Defisit'} rata-rata: {formatRupiahShort(Math.abs(avgNetSavings))} per bulan
        </Text>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <BarChart
          data={barData}
          height={200}
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
          maxValue={barChartMax}
          renderTooltip={(item: any) => (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>{formatRupiahShort(item.value)}</Text>
            </View>
          )}
        />
      </View>

      {/* Legend for Bars */}
      <View style={styles.barLegendRow}>
        <View style={styles.barLegendItem}>
          <View style={[styles.barLegendDot, { backgroundColor: theme.colors.income }]} />
          <Text style={styles.barLegendText}>Pemasukan</Text>
        </View>
        <View style={styles.barLegendItem}>
          <View style={[styles.barLegendDot, { backgroundColor: theme.colors.expense }]} />
          <Text style={styles.barLegendText}>Pengeluaran</Text>
        </View>
      </View>

      {/* Net Savings Line Chart Overlay */}
      <View style={styles.lineChartSection}>
        <Text style={styles.sectionTitle}>Tren Tabungan Bersih</Text>
        <LineChart
          data={lineData}
          color={lineColor}
          thickness={2.5}
          startFillColor={lineColor}
          endFillColor={lineColor}
          startOpacity={0.15}
          endOpacity={0.02}
          dataPointsColor={lineColor}
          dataPointsRadius={3}
          textFontSize={9}
          textColor={theme.colors.textSecondary}
          xAxisColor={theme.colors.border}
          yAxisColor={theme.colors.border}
          yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 9 }}
          height={150}
          spacing={50}
          isAnimated
          animationDuration={500}
          noOfSections={3}
          formatYLabel={(y: string) => formatRupiahShort(Number(y))}
        />
      </View>

      {/* Line Legend */}
      <View style={styles.lineLegendRow}>
        <View style={styles.lineLegendItem}>
          <View style={[styles.lineLegendDot, { backgroundColor: lineColor, height: 3 }]} />
          <Text style={styles.lineLegendText}>Tabungan Bersih (Income - Expense)</Text>
        </View>
      </View>

      {/* Monthly Breakdown Table */}
      <View style={styles.tableSection}>
        <Text style={styles.sectionTitle}>Detail per Bulan</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 1.5 }]}>Bulan</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>Income</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>Expense</Text>
          <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>Tabungan</Text>
        </View>
        {data.map((item, idx) => {
          const netSavings = item.income - item.expense;
          const isPositive = netSavings >= 0;
          return (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>
                {dayjs(item.month).format('MMM YY')}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: theme.colors.income }]}>
                {formatRupiahShort(item.income)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: theme.colors.expense }]}>
                {formatRupiahShort(item.expense)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: 1.2,
                    textAlign: 'right',
                    fontWeight: '700',
                    color: isPositive ? theme.colors.income : theme.colors.expense,
                  },
                ]}
              >
                {isPositive ? '+' : ''}{formatRupiahShort(netSavings)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.income }]}>
            {formatRupiahShort(data.reduce((sum, d) => sum + d.income, 0))}
          </Text>
        </View>
        <View style={styles.summarySpacer} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Total Expense</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.expense }]}>
            {formatRupiahShort(data.reduce((sum, d) => sum + d.expense, 0))}
          </Text>
        </View>
        <View style={styles.summarySpacer} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Net Savings</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: trendIsPositive ? theme.colors.income : theme.colors.expense,
                fontWeight: '700',
              },
            ]}
          >
            {trendIsPositive ? '+' : ''}{formatRupiahShort(
              data.reduce((sum, d) => sum + (d.income - d.expense), 0)
            )}
          </Text>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { paddingVertical: theme.spacing.md },
  emptyContainer: { height: 300, justifyContent: 'center' },
  infoBanner: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartContainer: { alignItems: 'center', marginVertical: theme.spacing.sm },
  tooltip: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tooltipText: { ...theme.typography.caption, color: theme.colors.textPrimary },
  barLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLegendDot: { width: 8, height: 8, borderRadius: 4 },
  barLegendText: { ...theme.typography.caption, fontSize: 9 },
  lineChartSection: { marginVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md },
  sectionTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  lineLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  lineLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineLegendDot: { width: 16, borderRadius: 1.5 },
  lineLegendText: { ...theme.typography.caption, fontSize: 9 },
  tableSection: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableRowAlt: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  tableCell: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryBlock: { flex: 1, alignItems: 'center' },
  summaryLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
  },
  summarySpacer: { width: 1, height: 28, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.sm },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { useTheme, type Theme } from '@/constants/theme';
import { formatRupiahShort } from '@/utils/format';
import { EmptyState } from '../ui/EmptyState';

export interface BurnRateDataPoint {
  date: string;
  cumulativeSpending: number;
}

interface BurnRateChartProps {
  /** Daily cumulative spending data for the month */
  data: BurnRateDataPoint[];
  /** Total monthly budget limit */
  monthlyBudget: number;
  /** Current day of month (1-31) */
  currentDay: number;
  /** Total days in the month */
  monthDays: number;
}

/**
 * Burn-Rate / Cumulative Spending Chart
 * 
 * Displays two lines:
 * 1. Target Pace (grey dashed): Linear ideal spending from 0 to monthly budget over the month
 * 2. Actual Cumulative Spending (red/blue): Real accumulated expenses
 * 
 * Visual warnings when actual crosses above target (overspending).
 */
export const BurnRateChart: React.FC<BurnRateChartProps> = ({
  data,
  monthlyBudget,
  currentDay,
  monthDays,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          title="Belum ada data"
          message="Transaksi akan muncul di sini"
          icon="trending-down-outline"
        />
      </View>
    );
  }

  // Determine if overspending (actual > target at current day)
  const currentActual = data[currentDay - 1]?.cumulativeSpending ?? 0;
  const currentTarget = (monthlyBudget / monthDays) * currentDay;
  const isOverspending = currentActual > currentTarget;
  const overspendAmount = Math.max(0, currentActual - currentTarget);

  // Line colors and styles
  const actualLineColor = isOverspending ? theme.colors.danger : theme.colors.primary;
  const targetLineColor = theme.colors.textMuted;

  // Prepare chart data with both actual and target pace
  // We'll overlay by creating a single dataset with both lines
  const chartData = data.slice(0, currentDay).map((point, idx) => {
    const day = idx + 1;
    const targetValue = (monthlyBudget / monthDays) * day;
    return {
      value: point.cumulativeSpending,
      label: day % Math.ceil(currentDay / 6) === 0 ? `Hari ${day}` : '',
      labelWidth: 40,
      labelPosition: 'top',
    };
  });

  return (
    <View style={styles.container}>
      {isOverspending && (
        <View style={[styles.warningBanner, { backgroundColor: `${theme.colors.danger}15` }]}>
          <Text style={[styles.warningText, { color: theme.colors.danger }]}>
            ⚠ Overspending by {formatRupiahShort(overspendAmount)}
          </Text>
        </View>
      )}

      <LineChart
        data={chartData}
        color={actualLineColor}
        thickness={2.5}
        startFillColor={actualLineColor}
        endFillColor={actualLineColor}
        startOpacity={0.1}
        endOpacity={0.02}
        dataPointsColor={actualLineColor}
        dataPointsRadius={2.5}
        textFontSize={9}
        textColor={theme.colors.textSecondary}
        xAxisColor={theme.colors.border}
        yAxisColor={theme.colors.border}
        yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 8 }}
        height={200}
        spacing={40}
        isAnimated
        animationDuration={500}
        noOfSections={4}
        formatYLabel={(y: string) => formatRupiahShort(Number(y))}
      />

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: actualLineColor, height: 3 }]} />
          <Text style={styles.legendLabel}>Pengeluaran Aktual</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendLine,
              { backgroundColor: targetLineColor, height: 2, borderRadius: 1 },
            ]}
          />
          <Text style={styles.legendLabel}>Target Pace</Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Hari {currentDay} dari {monthDays}</Text>
          <Text style={[styles.statValue, { color: actualLineColor }]}>
            {formatRupiahShort(currentActual)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Target Pace</Text>
          <Text style={[styles.statValue, { color: targetLineColor }]}>
            {formatRupiahShort(currentTarget)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Remaining Budget</Text>
          <Text
            style={[
              styles.statValue,
              { color: isOverspending ? theme.colors.danger : theme.colors.income },
            ]}
          >
            {formatRupiahShort(Math.max(0, monthlyBudget - currentActual))}
          </Text>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { paddingVertical: theme.spacing.md },
  emptyContainer: { height: 250, justifyContent: 'center' },
  warningBanner: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 20,
    borderRadius: 1.5,
  },
  legendLabel: {
    ...theme.typography.caption,
    fontSize: 9,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
});

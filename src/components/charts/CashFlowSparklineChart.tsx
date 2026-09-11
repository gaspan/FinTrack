import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { useTheme, type Theme } from '@/constants/theme';
import { formatRupiahShort } from '@/utils/format';
import { EmptyState } from '../ui/EmptyState';

export interface CashFlowDataPoint {
  date: string;
  balance: number;
}

interface CashFlowSparklineChartProps {
  /** Daily balance data for last 30-60 days */
  data: CashFlowDataPoint[];
  /** Current balance */
  currentBalance: number;
  /** Minimum safe balance threshold */
  minimumBalance?: number;
}

/**
 * Cash Flow Sparkline / Running Balance Chart
 * 
 * Displays daily liquidity trends to help prevent liquidity crises.
 * Features:
 * - Compact line chart with area gradient fill
 * - Balance trend indicator
 * - Warning if balance drops below minimum threshold
 * - Last 30-60 days of data
 */
export const CashFlowSparklineChart: React.FC<CashFlowSparklineChartProps> = ({
  data,
  currentBalance,
  minimumBalance = 0,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          title="Belum ada data"
          message="Riwayat saldo akan muncul di sini"
          icon="wallet-outline"
        />
      </View>
    );
  }

  // Sort data by date
  const sortedData = [...data].sort((a, b) =>
    dayjs(a.date).diff(dayjs(b.date))
  );

  // Calculate trend
  const firstBalance = sortedData[0]?.balance ?? 0;
  const lastBalance = sortedData[sortedData.length - 1]?.balance ?? 0;
  const balanceDelta = lastBalance - firstBalance;
  const trendIsPositive = balanceDelta >= 0;

  // Determine color based on trend
  const lineColor = trendIsPositive ? theme.colors.income : theme.colors.expense;
  const isBelowMinimum = currentBalance < minimumBalance;
  const warningColor = isBelowMinimum ? theme.colors.danger : lineColor;

  // Find min and max for scaling
  const minBalance = Math.min(...sortedData.map(d => d.balance));
  const maxBalance = Math.max(...sortedData.map(d => d.balance));

  // Prepare chart data - show every 5-10 day label to avoid crowding
  const labelInterval = Math.ceil(sortedData.length / 6);
  const chartData = sortedData.map((point, idx) => ({
    value: point.balance,
    label: idx % labelInterval === 0 ? dayjs(point.date).format('DD MMM') : '',
    labelWidth: 50,
  }));

  // Calculate volatility (standard deviation of daily changes)
  const dailyChanges = [];
  for (let i = 1; i < sortedData.length; i++) {
    dailyChanges.push(sortedData[i].balance - sortedData[i - 1].balance);
  }
  const avgChange = dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length;
  const variance =
    dailyChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) /
    dailyChanges.length;
  const volatility = Math.sqrt(variance);
  const volatilityStatus =
    volatility > Math.abs(avgChange) * 2 ? 'high' : volatility > Math.abs(avgChange) ? 'medium' : 'low';

  return (
    <View style={styles.container}>
      {/* Current Balance Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Saldo Saat Ini</Text>
          <Text style={[styles.summaryValue, { color: isBelowMinimum ? theme.colors.danger : theme.colors.textPrimary }]}>
            {formatRupiahShort(currentBalance)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Perubahan</Text>
          <Text style={[styles.summaryValue, { color: lineColor }]}>
            {trendIsPositive ? '+' : ''}{formatRupiahShort(balanceDelta)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Volatilitas</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textSecondary, fontSize: 13 }]}>
            {volatilityStatus === 'high' ? '⚠' : '✓'} {volatilityStatus}
          </Text>
        </View>
      </View>

      {/* Warning Banner */}
      {isBelowMinimum && (
        <View style={[styles.warningBanner, { backgroundColor: `${theme.colors.danger}15` }]}>
          <Text style={[styles.warningText, { color: theme.colors.danger }]}>
            Saldo di bawah minimum {formatRupiahShort(minimumBalance)}
          </Text>
        </View>
      )}

      {/* Sparkline Chart */}
      <LineChart
        data={chartData}
        color={warningColor}
        thickness={2}
        startFillColor={warningColor}
        endFillColor={warningColor}
        startOpacity={0.15}
        endOpacity={0.02}
        dataPointsColor={warningColor}
        dataPointsRadius={2}
        textFontSize={8}
        textColor={theme.colors.textSecondary}
        xAxisColor={theme.colors.border}
        yAxisColor={theme.colors.border}
        yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 9 }}
        xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 8 }}
        height={160}
        spacing={35}
        isAnimated
        animationDuration={500}
        noOfSections={3}
        formatYLabel={(y: string) => formatRupiahShort(Number(y))}
      />

      {/* Min/Max Info */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeBlock}>
          <Text style={styles.rangeLabel}>Terendah</Text>
          <Text style={[styles.rangeValue, { color: theme.colors.expense }]}>
            {formatRupiahShort(minBalance)}
          </Text>
        </View>
        <View style={styles.rangeBlock}>
          <Text style={styles.rangeLabel}>Tertinggi</Text>
          <Text style={[styles.rangeValue, { color: theme.colors.income }]}>
            {formatRupiahShort(maxBalance)}
          </Text>
        </View>
      </View>

      {/* Trend Indicator */}
      <View style={styles.trendContainer}>
        <Text style={styles.trendLabel}>
          {trendIsPositive ? '📈' : '📉'} Tren {Math.abs(balanceDelta) > 0 ? (trendIsPositive ? 'Naik' : 'Turun') : 'Stabil'}
        </Text>
        <Text style={styles.trendDescription}>
          {sortedData.length} hari terakhir
        </Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { paddingVertical: theme.spacing.md },
  emptyContainer: { height: 250, justifyContent: 'center' },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  summaryBlock: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...theme.typography.caption,
    fontSize: 8,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
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
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rangeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  rangeLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  rangeValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
  },
  trendContainer: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  trendLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  trendDescription: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});

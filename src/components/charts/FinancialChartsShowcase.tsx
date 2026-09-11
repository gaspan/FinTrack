import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { BurnRateChart, type BurnRateDataPoint } from '@/components/charts/BurnRateChart';
import { CashFlowSparklineChart, type CashFlowDataPoint } from '@/components/charts/CashFlowSparklineChart';
import { BudgetBulletChart, type BudgetBulletDataPoint } from '@/components/charts/BudgetBulletChart';
import { MonthlyTrendComboChart } from '@/components/charts/MonthlyTrendComboChart';
import dayjs from 'dayjs';

/**
 * Example/Integration Card for BurnRateChart
 * Shows cumulative spending vs ideal budget pace
 */
export const BurnRateExampleCard: React.FC<{
  data: BurnRateDataPoint[];
  monthlyBudget: number;
  currentDay: number;
  monthDays: number;
}> = ({ data, monthlyBudget, currentDay, monthDays }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleTitle}>📊 Burn Rate Analysis</Text>
      <Card style={styles.card}>
        <Text style={styles.cardDescription}>
          Track your spending pace throughout the month. The line shows your actual cumulative spending compared to the ideal linear budget pace.
        </Text>
        <BurnRateChart
          data={data}
          monthlyBudget={monthlyBudget}
          currentDay={currentDay}
          monthDays={monthDays}
        />
      </Card>
    </View>
  );
};

/**
 * Example/Integration Card for CashFlowSparklineChart
 * Shows daily balance trends to prevent liquidity crises
 */
export const CashFlowSparklineExampleCard: React.FC<{
  data: CashFlowDataPoint[];
  currentBalance: number;
  minimumBalance?: number;
}> = ({ data, currentBalance, minimumBalance }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleTitle}>💰 Daily Balance Trend</Text>
      <Card style={styles.card}>
        <Text style={styles.cardDescription}>
          Monitor your wallet balance over the last 30-60 days to identify spending patterns and prevent cash flow crises.
        </Text>
        <CashFlowSparklineChart
          data={data}
          currentBalance={currentBalance}
          minimumBalance={minimumBalance}
        />
      </Card>
    </View>
  );
};

/**
 * Example/Integration Card for BudgetBulletChart
 * Shows budget utilization with visual warnings
 */
export const BudgetBulletExampleCard: React.FC<{
  data: BudgetBulletDataPoint[];
}> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleTitle}>🎯 Budget Progress</Text>
      <Card style={styles.card}>
        <Text style={styles.cardDescription}>
          Visual budget utilization by category with color-coded status indicators. Green = Safe, Yellow = Caution, Red = Overbudget.
        </Text>
        <BudgetBulletChart data={data} showTop={6} />
      </Card>
    </View>
  );
};

/**
 * Example/Integration Card for MonthlyTrendComboChart
 * Enhanced monthly trend with net savings overlay
 */
export const MonthlyTrendComboExampleCard: React.FC<{
  data: Array<{ month: string; income: number; expense: number }>;
}> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleTitle}>📈 Monthly Financial Trend</Text>
      <Card style={styles.card}>
        <Text style={styles.cardDescription}>
          Combined view of income vs expense bars with an overlay line showing net savings trend. Identify your best and worst spending months.
        </Text>
        <MonthlyTrendComboChart data={data} />
      </Card>
    </View>
  );
};

/**
 * Comprehensive Dashboard Integration Example
 * Shows all new charts together
 */
export const FinancialChartsShowcase: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Mock data for demonstration
  const mockBurnRateData: BurnRateDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
    date: dayjs().startOf('month').add(i, 'days').format('YYYY-MM-DD'),
    cumulativeSpending: (i + 1) * 500000 + Math.random() * 300000,
  }));

  const mockCashFlowData: CashFlowDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: dayjs().subtract(30 - i, 'days').format('YYYY-MM-DD'),
    balance: 5000000 - i * 50000 + Math.random() * 500000,
  }));

  const mockBudgetData: BudgetBulletDataPoint[] = [
    {
      id: 1,
      categoryName: 'Groceries',
      categoryColor: '#10B981',
      actual: 3500000,
      budget: 5000000,
    },
    {
      id: 2,
      categoryName: 'Transportation',
      categoryColor: '#F59E0B',
      actual: 2800000,
      budget: 3000000,
      rollover: 500000,
    },
    {
      id: 3,
      categoryName: 'Entertainment',
      categoryColor: '#8B5CF6',
      actual: 1200000,
      budget: 1500000,
    },
  ];

  const mockTrendData = Array.from({ length: 6 }, (_, i) => ({
    month: dayjs().subtract(5 - i, 'months').format('YYYY-MM'),
    income: 20000000 + Math.random() * 5000000,
    expense: 12000000 + Math.random() * 3000000,
  }));

  return (
    <View style={styles.showcaseContainer}>
      <Text style={styles.showcaseTitle}>🎯 New Financial Charts Dashboard</Text>
      <Text style={styles.showcaseSubtitle}>Actionable budgeting insights at a glance</Text>

      <BurnRateExampleCard
        data={mockBurnRateData}
        monthlyBudget={10000000}
        currentDay={15}
        monthDays={dayjs().daysInMonth()}
      />

      <CashFlowSparklineExampleCard
        data={mockCashFlowData}
        currentBalance={3500000}
        minimumBalance={1000000}
      />

      <BudgetBulletExampleCard data={mockBudgetData} />

      <MonthlyTrendComboExampleCard data={mockTrendData} />

      {/* Implementation Guide */}
      <View style={styles.guideSection}>
        <Text style={styles.guideTitle}>📚 Implementation Guide</Text>
        <Text style={styles.guideText}>
          {`1. BurnRateChart: Place in AnalyticsLayer to track month-end pace
2. CashFlowSparklineChart: Add to AlertsLayer for liquidity monitoring
3. BudgetBulletChart: Replace CategoryBarChart in OperationalLayer
4. MonthlyTrendComboChart: Replace MonthlyTrendChart in AnalyticsLayer

All charts support:
• Dark/Light theme modes
• Type-safe TypeScript interfaces
• Memoized calculations for performance
• Responsive mobile layouts
• Accessibility features`}
        </Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  exampleContainer: { marginVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md },
  exampleTitle: {
    ...theme.typography.h3,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  card: { borderRadius: theme.radius.xl, ...theme.shadow.sm },
  cardDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  showcaseContainer: { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md },
  showcaseTitle: {
    ...theme.typography.h3,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  showcaseSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  guideSection: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
  },
  guideTitle: {
    ...theme.typography.h3,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  guideText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
});

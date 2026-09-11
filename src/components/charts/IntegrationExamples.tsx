import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';

import { useTheme, type Theme } from '@/constants/theme';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { Card } from '@/components/ui/Card';

import { BurnRateChart, type BurnRateDataPoint } from '@/components/charts/BurnRateChart';
import { CashFlowSparklineChart, type CashFlowDataPoint } from '@/components/charts/CashFlowSparklineChart';
import { BudgetBulletChart, type BudgetBulletDataPoint } from '@/components/charts/BudgetBulletChart';
import { MonthlyTrendComboChart } from '@/components/charts/MonthlyTrendComboChart';

/**
 * INTEGRATION EXAMPLES FOR FINTRACK DASHBOARD LAYERS
 * 
 * These are complete examples showing how to integrate the new charts
 * into the existing FinTrack dashboard structure.
 */

// ============================================================================
// EXAMPLE 1: Enhanced OperationalLayer with BudgetBulletChart
// ============================================================================

interface EnhancedOperationalLayerProps {
  monthExpense: Array<{ value: number; label: string; color: string }>;
  monthIncome: Array<{ value: number; label: string; color: string }>;
  budgets: Array<{
    id: number;
    category_name: string;
    color: string;
    monthly_limit: number;
    spent: number;
    rollover_amount?: number;
  }>;
}

/**
 * BEFORE: Showed raw top 6 categories
 * AFTER: Replaced with BudgetBulletChart for actionable budget context
 */
export const EnhancedOperationalLayer: React.FC<EnhancedOperationalLayerProps> = ({
  monthExpense,
  monthIncome,
  budgets,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Convert budget data to BudgetBulletChart format
  const bulletChartData: BudgetBulletDataPoint[] = useMemo(() => {
    return budgets.map(b => ({
      id: b.id,
      categoryName: b.category_name,
      categoryColor: b.color,
      actual: b.spent,
      budget: b.monthly_limit,
      rollover: b.rollover_amount,
    }));
  }, [budgets]);

  if (!monthExpense && !monthIncome) return null;

  return (
    <>
      {/* Month This/Budget Overview */}
      <AnimatedSection index={0}>
        <View>
          <SectionHeader
            title={`Bulan Ini · ${dayjs().format('MMMM')}`}
            icon="wallet-outline"
            actionLabel="Kelola"
            onAction={() => {
              /* Navigate to budget management */
            }}
          />
          <Card style={styles.card}>
            <BudgetBulletChart data={bulletChartData} showTop={6} />
          </Card>
        </View>
      </AnimatedSection>

      {/* Optional: Recent Transactions below */}
      <AnimatedSection index={1}>
        <View>{/* RecentTransactionsCard */}</View>
      </AnimatedSection>
    </>
  );
};

// ============================================================================
// EXAMPLE 2: Enhanced AnalyticsLayer with BurnRateChart & ComboChart
// ============================================================================

interface EnhancedAnalyticsLayerProps {
  trendData: Array<{ month: string; income: number; expense: number }>;
  burnRateData: BurnRateDataPoint[];
  monthlyBudget: number;
  currentDay: number;
  monthDays: number;
}

/**
 * BEFORE: Just MonthlyTrendChart (bars only)
 * AFTER: 
 *   1. BurnRateChart for month-end pace tracking
 *   2. MonthlyTrendComboChart for trend + net savings
 */
export const EnhancedAnalyticsLayer: React.FC<EnhancedAnalyticsLayerProps> = ({
  trendData,
  burnRateData,
  monthlyBudget,
  currentDay,
  monthDays,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <>
      {/* Month-End Burn Rate Tracking */}
      <AnimatedSection index={0}>
        <View>
          <SectionHeader title="Pace Pengeluaran" icon="trending-down-outline" />
          <Card style={styles.card}>
            <Text style={styles.description}>
              Bandingkan pengeluaran aktual Anda dengan pace ideal untuk sisa bulan ini.
            </Text>
            <BurnRateChart
              data={burnRateData}
              monthlyBudget={monthlyBudget}
              currentDay={currentDay}
              monthDays={monthDays}
            />
          </Card>
        </View>
      </AnimatedSection>

      {/* Enhanced Monthly Trend with Net Savings */}
      <AnimatedSection index={1}>
        <View>
          <SectionHeader title="Tren 6 Bulan" icon="analytics-outline" />
          <Card style={styles.card}>
            <Text style={styles.description}>
              Lihat tren income, expense, dan tabungan bersih Anda selama 6 bulan terakhir.
            </Text>
            <MonthlyTrendComboChart data={trendData} />
          </Card>
        </View>
      </AnimatedSection>
    </>
  );
};

// ============================================================================
// EXAMPLE 3: Enhanced AlertsLayer with CashFlowSparklineChart
// ============================================================================

interface EnhancedAlertsLayerProps {
  cashFlowData: CashFlowDataPoint[];
  currentBalance: number;
  minimumBalance: number;
  alerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
}

/**
 * BEFORE: Just financial health + spending alerts
 * AFTER: Added CashFlowSparklineChart for liquidity monitoring
 */
export const EnhancedAlertsLayer: React.FC<EnhancedAlertsLayerProps> = ({
  cashFlowData,
  currentBalance,
  minimumBalance,
  alerts,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <>
      {/* Liquidity Health Monitoring */}
      <AnimatedSection index={0}>
        <View>
          <SectionHeader title="Kesehatan Likuiditas" icon="trending-up-outline" />
          <Card style={styles.card}>
            <Text style={styles.description}>
              Monitor pergerakan saldo harian Anda untuk mendeteksi pola pengeluaran dan risiko likuiditas.
            </Text>
            <CashFlowSparklineChart
              data={cashFlowData}
              currentBalance={currentBalance}
              minimumBalance={minimumBalance}
            />
          </Card>
        </View>
      </AnimatedSection>

      {/* Existing Alerts */}
      <AnimatedSection index={1}>
        <View>{/* SmartInsightCard with alerts */}</View>
      </AnimatedSection>
    </>
  );
};

// ============================================================================
// EXAMPLE 4: Complete Integrated Dashboard Section
// ============================================================================

interface CompleteFinancialChartsIntegrationProps {
  // From useDashboardData
  monthExpense: Array<{ value: number; label: string; color: string }>;
  monthIncome: Array<{ value: number; label: string; color: string }>;
  budgets: Array<{
    id: number;
    category_name: string;
    color: string;
    monthly_limit: number;
    spent: number;
    rollover_amount?: number;
  }>;
  trendData: Array<{ month: string; income: number; expense: number }>;
}

/**
 * Complete example showing all three new charts working together
 * in a cohesive financial insights dashboard
 */
export const CompleteFinancialChartsIntegration: React.FC<
  CompleteFinancialChartsIntegrationProps
> = ({ monthExpense, monthIncome, budgets, trendData }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Generate mock data (replace with real data from hooks)
  const mockBurnRateData: BurnRateDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
    date: dayjs().startOf('month').add(i, 'days').format('YYYY-MM-DD'),
    cumulativeSpending: (i + 1) * 500000 + Math.random() * 300000,
  }));

  const mockCashFlowData: CashFlowDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: dayjs().subtract(30 - i, 'days').format('YYYY-MM-DD'),
    balance: 5000000 - i * 50000 + Math.random() * 500000,
  }));

  const bulletChartData: BudgetBulletDataPoint[] = budgets.map(b => ({
    id: b.id,
    categoryName: b.category_name,
    categoryColor: b.color,
    actual: b.spent,
    budget: b.monthly_limit,
    rollover: b.rollover_amount,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>💡 Financial Insights Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Your complete view of spending, budgets, and financial health
        </Text>
      </View>

      {/* 1. Budget Utilization */}
      <AnimatedSection index={0}>
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Budget Status"
            icon="wallet-outline"
            actionLabel="Manage"
          />
          <Card style={styles.card}>
            <View style={styles.sectionDescription}>
              <Text style={styles.description}>
                📊 Track spending against category budgets with instant status indicators
              </Text>
            </View>
            <BudgetBulletChart data={bulletChartData} showTop={6} />
          </Card>
        </View>
      </AnimatedSection>

      {/* 2. Month-End Burn Rate */}
      <AnimatedSection index={1}>
        <View style={styles.sectionContainer}>
          <SectionHeader title="Monthly Pace" icon="trending-down-outline" />
          <Card style={styles.card}>
            <View style={styles.sectionDescription}>
              <Text style={styles.description}>
                📈 Compare your actual spending pace against the ideal linear budget pace
              </Text>
            </View>
            <BurnRateChart
              data={mockBurnRateData}
              monthlyBudget={10000000}
              currentDay={Math.min(dayjs().date(), dayjs().daysInMonth())}
              monthDays={dayjs().daysInMonth()}
            />
          </Card>
        </View>
      </AnimatedSection>

      {/* 3. Liquidity Monitoring */}
      <AnimatedSection index={2}>
        <View style={styles.sectionContainer}>
          <SectionHeader title="Daily Balance Trend" icon="trending-up-outline" />
          <Card style={styles.card}>
            <View style={styles.sectionDescription}>
              <Text style={styles.description}>
                💰 Monitor wallet balance volatility and identify spending patterns
              </Text>
            </View>
            <CashFlowSparklineChart
              data={mockCashFlowData}
              currentBalance={3500000}
              minimumBalance={1000000}
            />
          </Card>
        </View>
      </AnimatedSection>

      {/* 4. 6-Month Financial Trend */}
      <AnimatedSection index={3}>
        <View style={styles.sectionContainer}>
          <SectionHeader title="6-Month Trend" icon="analytics-outline" />
          <Card style={styles.card}>
            <View style={styles.sectionDescription}>
              <Text style={styles.description}>
                📊 See your income, expenses, and net savings trend over the last 6 months
              </Text>
            </View>
            <MonthlyTrendComboChart data={trendData} />
          </Card>
        </View>
      </AnimatedSection>

      {/* Insights Summary */}
      <AnimatedSection index={4}>
        <View style={styles.insightsSectionContainer}>
          <Text style={styles.insightsTitle}>🎯 Key Insights</Text>
          <View style={styles.insightsList}>
            <InsightItem
              icon="💡"
              title="Budget Status"
              message={getBudgetInsight(bulletChartData)}
            />
            <InsightItem
              icon="📊"
              title="Spending Pace"
              message={getSpendingPaceInsight(mockBurnRateData)}
            />
            <InsightItem
              icon="💰"
              title="Liquidity Health"
              message={getLiquidityInsight(mockCashFlowData)}
            />
            <InsightItem
              icon="📈"
              title="Savings Trend"
              message={getSavingsTrendInsight(trendData)}
            />
          </View>
        </View>
      </AnimatedSection>
    </View>
  );
};

/**
 * Helper Components for Insights
 */
interface InsightItemProps {
  icon: string;
  title: string;
  message: string;
}

const InsightItem: React.FC<InsightItemProps> = ({ icon, title, message }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.insightItem}>
      <Text style={styles.insightIcon}>{icon}</Text>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightMessage}>{message}</Text>
      </View>
    </View>
  );
};

/**
 * Insight Calculation Functions
 */
function getBudgetInsight(data: BudgetBulletDataPoint[]): string {
  const overBudget = data.filter(item => item.actual > item.budget).length;
  if (overBudget > 0) {
    return `⚠️ ${overBudget} kategori melebihi budget`;
  }
  const nearLimit = data.filter(
    item => item.actual / (item.budget + (item.rollover || 0)) > 0.75
  ).length;
  if (nearLimit > 0) {
    return `⚡ ${nearLimit} kategori mendekati batas`;
  }
  return '✅ Semua kategori dalam kontrol';
}

function getSpendingPaceInsight(data: BurnRateDataPoint[]): string {
  if (!data || data.length === 0) return 'Data tidak tersedia';
  const latest = data[data.length - 1];
  const monthlyBudget = 10000000; // Replace with actual
  const expectedPace = (monthlyBudget / dayjs().daysInMonth()) * data.length;
  if (latest.cumulativeSpending > expectedPace * 1.1) {
    return '🔴 Pengeluaran melebihi pace ideal';
  }
  if (latest.cumulativeSpending > expectedPace * 0.9) {
    return '🟡 Pengeluaran sesuai pace';
  }
  return '🟢 Pengeluaran di bawah pace ideal';
}

function getLiquidityInsight(data: CashFlowDataPoint[]): string {
  if (!data || data.length === 0) return 'Data tidak tersedia';
  const balances = data.map(d => d.balance);
  const minBalance = Math.min(...balances);
  const avgBalance = balances.reduce((a, b) => a + b, 0) / balances.length;
  if (minBalance < 1000000) {
    return '⚠️ Saldo pernah di bawah minimum safety';
  }
  if (avgBalance < 2000000) {
    return '⚡ Rata-rata saldo cukup rendah';
  }
  return '✅ Likuiditas sehat';
}

function getSavingsTrendInsight(data: Array<{ month: string; income: number; expense: number }>): string {
  if (!data || data.length === 0) return 'Data tidak tersedia';
  const savings = data.map(d => d.income - d.expense);
  const lastMonthSavings = savings[savings.length - 1];
  const avgSavings = savings.reduce((a, b) => a + b, 0) / savings.length;
  if (lastMonthSavings > avgSavings * 1.1) {
    return '📈 Tabungan bulan ini lebih baik dari rata-rata';
  }
  if (lastMonthSavings < 0) {
    return '📉 Defisit bulan ini';
  }
  return '→ Tabungan sesuai tren';
}

// ============================================================================
// Styles
// ============================================================================

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { paddingVertical: theme.spacing.md },
  headerSection: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  headerTitle: {
    ...theme.typography.h2,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  sectionContainer: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  card: { borderRadius: theme.radius.xl, ...theme.shadow.sm },
  sectionDescription: { marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.sm },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  insightsSectionContainer: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  insightsTitle: {
    ...theme.typography.h3,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  insightsList: { gap: theme.spacing.md },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  insightContent: { flex: 1 },
  insightTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});

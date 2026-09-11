import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useBook } from '@/constants/books';
import {
  ChartQueries,
  WalletQueries,
  TransactionQueries,
  TrendQueries,
  NetWorthQueries,
  BudgetQueries,
  SavingsGoalQueries,
} from '@/lib/queries';
import { getPayrollPeriod, getPreviousPayrollPeriod, findSalaryCategoryId } from '@/utils/payroll';
import { loadInsights } from '@/features/insights';
import { calculateSafeToSpend } from '@/features/forecast/forecastEngine';
import { loadUpcomingBills, type UpcomingItem } from '@/features/dashboard/upcomingBills';
import type { BudgetRow } from '@/components/dashboard/BudgetProgressCard';
import type {
  TransactionWithDetails,
  Wallet,
  SafeToSpendData,
  CategoryInsight,
  SpendingAlert,
  FinancialHealthScore,
  FinancialTip,
  SavingsGoal,
  ChartDataPoint,
} from '@/types';

const PAYROLL_ENABLED_KEY = 'payroll_enabled';
const PAYROLL_DAY_KEY = 'payroll_day';
const PAYROLL_CATEGORY_KEY = 'payroll_category_id';
const SAFE_TO_SPEND_KEY = 'safe_to_spend_enabled';

export interface PayrollPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

interface PayrollConfig extends PayrollPeriod {
  payrollEnabled: boolean;
  salaryDay: number;
  salaryCategoryId: number | null;
}

interface LoadOptions {
  startDate?: string;
  endDate?: string;
  payrollEnabled?: boolean;
  salaryDay?: number;
  salaryCategoryId?: number | null;
}

export type DashboardData = ReturnType<typeof useDashboardData>;

/**
 * Satu-satunya sumber data dashboard. Screen hanya merakit layer,
 * semua query dan turunannya dihitung di sini.
 */
export function useDashboardData() {
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [isManualDateRange, setIsManualDateRange] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState<PayrollPeriod | null>(null);
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');

  const [totalBalance, setTotalBalance] = useState(0);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [lastMonthSummary, setLastMonthSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [chartData, setChartData] = useState<{ value: number; label: string; color: string }[]>([]);
  const [monthExpense, setMonthExpense] = useState<ChartDataPoint[]>([]);
  const [monthIncome, setMonthIncome] = useState<ChartDataPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [primaryWallet, setPrimaryWallet] = useState<Wallet | null>(null);
  const [cashFlow, setCashFlow] = useState(0);
  const [insightData, setInsightData] = useState<{
    comparisons: CategoryInsight[];
    alerts: SpendingAlert[];
    financialHealth: FinancialHealthScore | null;
    financialTips: FinancialTip[];
  }>({ comparisons: [], alerts: [], financialHealth: null, financialTips: [] });
  const [netWorthData, setNetWorthData] = useState<{ totalAssets: number; totalLiabilities: number; netWorth: number } | null>(null);
  const [netWorthHistory, setNetWorthHistory] = useState<number[]>([]);
  const [safeToSpendData, setSafeToSpendData] = useState<SafeToSpendData | null>(null);
  const [safeToSpendEnabled, setSafeToSpendEnabled] = useState(true);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  const initPayrollPeriod = useCallback(async (): Promise<PayrollConfig | null> => {
    if (isManualDateRange) return null;

    const [enabledRaw, dayRaw, categoryIdRaw] = await Promise.all([
      AsyncStorage.getItem(PAYROLL_ENABLED_KEY),
      AsyncStorage.getItem(PAYROLL_DAY_KEY),
      AsyncStorage.getItem(PAYROLL_CATEGORY_KEY),
    ]);

    if (enabledRaw === 'false') {
      setPayrollPeriod(null);
      return null;
    }

    const salaryDay = dayRaw ? parseInt(dayRaw, 10) : 25;
    const preferredCategoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;
    const salaryCategoryId = await findSalaryCategoryId(db, bookId, preferredCategoryId);
    if (!salaryCategoryId) {
      setPayrollPeriod(null);
      return null;
    }

    const period = await getPayrollPeriod(db, salaryDay, salaryCategoryId, undefined, bookId);
    setPayrollPeriod({ startDate: period.startDate, endDate: period.endDate, label: period.label });
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    return {
      startDate: period.startDate,
      endDate: period.endDate,
      label: period.label,
      payrollEnabled: true,
      salaryDay,
      salaryCategoryId,
    };
  }, [db, isManualDateRange, bookId]);

  const loadData = useCallback(async (options?: LoadOptions) => {
    try {
      const chartQueries = new ChartQueries(db, bookId);
      const trendQueries = new TrendQueries(db, bookId);

      const walletsAll = await new WalletQueries(db, bookId).getAll();
      setTotalBalance(walletsAll.reduce((acc, w) => acc + w.balance, 0));
      setPrimaryWallet(walletsAll.find(w => w.is_primary) || walletsAll[0] || null);

      const from = options?.startDate ?? startDate;
      const to = options?.endDate ?? endDate;

      let payrollEnabled = options?.payrollEnabled ?? false;
      let salaryDay = options?.salaryDay ?? 25;
      let salaryCategoryId = options?.salaryCategoryId ?? null;

      if (!options || options.payrollEnabled === undefined) {
        const [enabledRaw, dayRaw, categoryIdRaw] = await Promise.all([
          AsyncStorage.getItem(PAYROLL_ENABLED_KEY),
          AsyncStorage.getItem(PAYROLL_DAY_KEY),
          AsyncStorage.getItem(PAYROLL_CATEGORY_KEY),
        ]);
        payrollEnabled = enabledRaw !== 'false';
        salaryDay = dayRaw ? parseInt(dayRaw, 10) : 25;
        const preferred = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;
        salaryCategoryId = payrollEnabled ? await findSalaryCategoryId(db, bookId, preferred) : null;
      }

      let prevFrom = dayjs(from).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      let prevTo = dayjs(to).subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
      if (payrollEnabled && salaryCategoryId) {
        const prev = await getPreviousPayrollPeriod(db, salaryDay, salaryCategoryId, from, bookId);
        prevFrom = prev.startDate;
        prevTo = prev.endDate;
      }

      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
      const toPoint = (i: { total: number; category_name: string; color: string }): { value: number; label: string; color: string } => ({
        value: i.total,
        label: i.category_name,
        color: i.color,
      });

      const nwQ = new NetWorthQueries(db, bookId);
      const [
        summaryData, prevMonthData, trend, cFlow, breakdown,
        monthExp, monthInc, txs, nw, nwHistory,
        budgetRows, goalRows, stsEnabledRaw, safeData, insights, upcomingItems,
      ] = await Promise.all([
        chartQueries.getSummary(from, to),
        chartQueries.getSummary(prevFrom, prevTo),
        trendQueries.getMonthlyTrend(6),
        trendQueries.getCashFlow(),
        chartQueries.getCategoryBreakdown(from, to, chartType),
        chartQueries.getCategoryBreakdown(monthStart, monthEnd, 'expense'),
        chartQueries.getCategoryBreakdown(monthStart, monthEnd, 'income'),
        new TransactionQueries(db, bookId).getByDateRange(from, to),
        nwQ.getCurrentNetWorth(),
        nwQ.getNetWorthHistory(12),
        new BudgetQueries(db, bookId).getByMonth(dayjs().format('YYYY-MM')),
        new SavingsGoalQueries(db, bookId).getAll(),
        AsyncStorage.getItem(SAFE_TO_SPEND_KEY),
        calculateSafeToSpend(db, bookId),
        loadInsights(db, bookId),
        loadUpcomingBills(db, bookId, 7),
      ]);

      setSummary(summaryData);
      setLastMonthSummary(prevMonthData);
      setTrendData(trend);
      setCashFlow(cFlow.reduce((acc, c) => acc + c.flow, 0));
      setChartData(breakdown.map(toPoint));
      setMonthExpense(monthExp.map(toPoint));
      setMonthIncome(monthInc.map(toPoint));
      setRecentTransactions(txs.slice(0, 5));
      setNetWorthData(nw);
      setNetWorthHistory(nwHistory.map(s => s.net_worth).reverse());
      setBudgets(budgetRows as BudgetRow[]);
      setGoals(goalRows);
      setSafeToSpendEnabled(stsEnabledRaw !== 'false');
      setSafeToSpendData(safeData);
      setInsightData(insights);
      setUpcoming(upcomingItems);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setInitialLoad(false);
    }
  }, [db, startDate, endDate, chartType, bookId]);

  const reload = useCallback(async () => {
    const config = await initPayrollPeriod();
    await loadData(config ? {
      startDate: config.startDate,
      endDate: config.endDate,
      payrollEnabled: config.payrollEnabled,
      salaryDay: config.salaryDay,
      salaryCategoryId: config.salaryCategoryId,
    } : undefined);
  }, [initPayrollPeriod, loadData]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setIsManualDateRange(true);
    const isPayrollRange = payrollPeriod && start === payrollPeriod.startDate && end === payrollPeriod.endDate;
    if (!isPayrollRange) setPayrollPeriod(null);
    setStartDate(start);
    setEndDate(end);
  }, [payrollPeriod]);

  const trend = useMemo(() => {
    const totalThis = summary.totalIncome - summary.totalExpense;
    const totalLast = lastMonthSummary.totalIncome - lastMonthSummary.totalExpense;
    const diff = totalThis - totalLast;
    return {
      diff,
      isUp: diff >= 0,
      pct: totalLast !== 0 ? Math.abs((diff / Math.abs(totalLast)) * 100).toFixed(0) : '100',
    };
  }, [summary, lastMonthSummary]);

  const budgetTotals = useMemo(() => {
    const limit = budgets.reduce((a, b) => a + b.monthly_limit + (b.rollover_amount || 0), 0);
    const spent = budgets.reduce((a, b) => a + b.spent, 0);
    return { limit, spent, pct: limit > 0 ? (spent / limit) * 100 : 0 };
  }, [budgets]);

  const chartTotal = chartType === 'income' ? summary.totalIncome : summary.totalExpense;
  const isPeriodEmpty =
    summary.totalIncome === 0 && summary.totalExpense === 0 && recentTransactions.length === 0;

  return {
    bookId,
    initialLoad,
    refreshing,
    onRefresh,
    startDate,
    endDate,
    chartType,
    setChartType,
    payrollPeriod,
    handleDateRangeChange,
    totalBalance,
    summary,
    chartData,
    chartTotal,
    monthExpense,
    monthIncome,
    recentTransactions,
    trendData,
    trend,
    trendLabel: payrollPeriod ? 'dari periode gaji sebelumnya' : 'dari bulan lalu',
    primaryWallet,
    cashFlow,
    insightData,
    netWorthData,
    netWorthHistory,
    safeToSpendData: safeToSpendEnabled ? safeToSpendData : null,
    budgets,
    budgetTotals,
    goals,
    upcoming,
    isPeriodEmpty,
  };
}

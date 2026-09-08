import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { ChartQueries, WalletQueries, TransactionQueries, TrendQueries, NetWorthQueries, BudgetQueries, SavingsGoalQueries } from '@/lib/queries';
import { getPayrollPeriod, getPreviousPayrollPeriod, findSalaryCategoryId } from '@/utils/payroll';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TransactionWithDetails, Wallet, SafeToSpendData, CategoryInsight, SpendingAlert, FinancialHealthScore, FinancialTip, SavingsGoal, ChartDataPoint } from '@/types';
import { formatRupiah, formatRupiahShort } from '@/utils/format';
import { generateAndSharePDF } from '@/features/export/pdfGenerator';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { SpendingInsightCard } from '@/features/insights/SpendingInsightCard';
import { FinancialTipsCard } from '@/features/insights/FinancialTipsCard';
import { NetWorthSummaryCard } from '@/components/networth/NetWorthSummaryCard';
import { SafeToSpendCard } from '@/components/dashboard/SafeToSpendCard';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AnalyticsCard } from '@/components/dashboard/AnalyticsCard';
import { GoldPriceCard } from '@/components/dashboard/GoldPriceCard';
import { MonthBarsCard } from '@/components/dashboard/MonthBarsCard';
import { UsdIdrCard } from '@/components/dashboard/UsdIdrCard';
import { EconNewsCarousel } from '@/components/dashboard/EconNewsCarousel';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { BudgetProgressCard, type BudgetRow } from '@/components/dashboard/BudgetProgressCard';
import { GoalsStrip } from '@/components/dashboard/GoalsStrip';
import { loadInsights } from '@/features/insights';
import { staggerDelay, shouldReduceMotion } from '@/utils/motion';
import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { Sparkline } from '@/components/ui/Sparkline';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateSafeToSpend } from '@/features/forecast/forecastEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYROLL_ENABLED_KEY = 'payroll_enabled';
const PAYROLL_DAY_KEY = 'payroll_day';
const PAYROLL_CATEGORY_KEY = 'payroll_category_id';

 dayjs.locale('id');

 function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;
  
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [isManualDateRange, setIsManualDateRange] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState<{ startDate: string; endDate: string; label: string } | null>(null);
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  const [exporting, setExporting] = useState(false);

  const [totalBalance, setTotalBalance] = useState(0);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [lastMonthSummary, setLastMonthSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [monthExpense, setMonthExpense] = useState<ChartDataPoint[]>([]);
  const [monthIncome, setMonthIncome] = useState<ChartDataPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [primaryWallet, setPrimaryWallet] = useState<Wallet | null>(null);
  const [cashFlow, setCashFlow] = useState<number>(0);
  const [insightData, setInsightData] = useState<{ comparisons: CategoryInsight[]; alerts: SpendingAlert[]; financialHealth: FinancialHealthScore | null; financialTips: FinancialTip[] }>({ comparisons: [], alerts: [], financialHealth: null, financialTips: [] });
  const [netWorthData, setNetWorthData] = useState<{ totalAssets: number; totalLiabilities: number; netWorth: number } | null>(null);
  const [safeToSpendData, setSafeToSpendData] = useState<SafeToSpendData | null>(null);
  const [safeToSpendEnabled, setSafeToSpendEnabled] = useState(true);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<number[]>([]);

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.28 }],
    opacity: interpolate(scrollY.value, [0, 320], [1, 0.55], Extrapolation.CLAMP),
  }));
  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [150, 230], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [150, 230], [-10, 0], Extrapolation.CLAMP) },
    ],
  }));
  const gentleFloat = shouldReduceMotion()
    ? undefined
    : {
        animationName: {
          from: { transform: [{ translateY: 0 }] },
          to: { transform: [{ translateY: -6 }] },
        },
        animationDuration: '2.2s',
        animationIterationCount: 'infinite' as const,
        animationDirection: 'alternate' as const,
        animationTimingFunction: 'ease-in-out' as const,
      };

  const initPayrollPeriod = useCallback(async () => {
    if (isManualDateRange) return null;

    const [enabledRaw, dayRaw, categoryIdRaw] = await Promise.all([
      AsyncStorage.getItem(PAYROLL_ENABLED_KEY),
      AsyncStorage.getItem(PAYROLL_DAY_KEY),
      AsyncStorage.getItem(PAYROLL_CATEGORY_KEY),
    ]);

    const enabled = enabledRaw !== 'false';
    if (!enabled) {
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
    const nextPeriod = {
      startDate: period.startDate,
      endDate: period.endDate,
      label: period.label,
      payrollEnabled: true,
      salaryDay,
      salaryCategoryId,
    };
    setPayrollPeriod({ startDate: period.startDate, endDate: period.endDate, label: period.label });
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    return nextPeriod;
  }, [db, isManualDateRange, bookId]);

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setIsManualDateRange(true);
    const isPayrollRange = payrollPeriod && start === payrollPeriod.startDate && end === payrollPeriod.endDate;
    if (!isPayrollRange) {
      setPayrollPeriod(null);
    }
    setStartDate(start);
    setEndDate(end);
  }, [payrollPeriod]);

  const loadData = useCallback(async (options?: {
    startDate?: string;
    endDate?: string;
    payrollEnabled?: boolean;
    salaryDay?: number;
    salaryCategoryId?: number | null;
  }) => {
    try {
      const chartQueries = new ChartQueries(db, bookId);
      const walletQueries = new WalletQueries(db, bookId);
      const txQueries = new TransactionQueries(db, bookId);
      const trendQueries = new TrendQueries(db, bookId);

      const walletsAll = await walletQueries.getAll();
      const balance = walletsAll.reduce((acc, w) => acc + w.balance, 0);
      setTotalBalance(balance);
      const primary = walletsAll.find(w => w.is_primary) || walletsAll[0] || null;
      setPrimaryWallet(primary);

      const currentStartDate = options?.startDate ?? startDate;
      const currentEndDate = options?.endDate ?? endDate;

      let payrollEnabled = options?.payrollEnabled ?? false;
      let salaryDay = options?.salaryDay ?? 25;
      let salaryCategoryId: number | null = options?.salaryCategoryId ?? null;

      if (!options || options.payrollEnabled === undefined) {
        const [enabledRaw, dayRaw, categoryIdRaw] = await Promise.all([
          AsyncStorage.getItem(PAYROLL_ENABLED_KEY),
          AsyncStorage.getItem(PAYROLL_DAY_KEY),
          AsyncStorage.getItem(PAYROLL_CATEGORY_KEY),
        ]);
        payrollEnabled = enabledRaw !== 'false';
        salaryDay = dayRaw ? parseInt(dayRaw, 10) : 25;
        const preferredCategoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;
        salaryCategoryId = payrollEnabled ? await findSalaryCategoryId(db, bookId, preferredCategoryId) : null;
      }

      let prevStartDate = dayjs(currentStartDate).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      let prevEndDate = dayjs(currentEndDate).subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

      if (payrollEnabled && salaryCategoryId) {
        const prevPeriod = await getPreviousPayrollPeriod(db, salaryDay, salaryCategoryId, currentStartDate, bookId);
        prevStartDate = prevPeriod.startDate;
        prevEndDate = prevPeriod.endDate;
      }

      const [summaryData, prevMonthData, trend, cFlow] = await Promise.all([
        chartQueries.getSummary(currentStartDate, currentEndDate),
        chartQueries.getSummary(prevStartDate, prevEndDate),
        trendQueries.getMonthlyTrend(6),
        trendQueries.getCashFlow(),
      ]);
      setSummary(summaryData);
      setLastMonthSummary(prevMonthData);
      setTrendData(trend);
      setCashFlow(cFlow.reduce((acc: any, c: any) => acc + c.flow, 0));

      const breakdown = await chartQueries.getCategoryBreakdown(currentStartDate, currentEndDate, chartType);
      setChartData(breakdown.map(item => ({
        value: item.total,
        label: item.category_name,
        color: item.color,
      })));

      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
      const [monthExp, monthInc] = await Promise.all([
        chartQueries.getCategoryBreakdown(monthStart, monthEnd, 'expense'),
        chartQueries.getCategoryBreakdown(monthStart, monthEnd, 'income'),
      ]);
      const toPoint = (item: { total: number; category_name: string; color: string }): ChartDataPoint => ({
        value: item.total,
        label: item.category_name,
        color: item.color,
      });
      setMonthExpense(monthExp.map(toPoint));
      setMonthIncome(monthInc.map(toPoint));

      const txs = await txQueries.getByDateRange(currentStartDate, currentEndDate);
      setRecentTransactions(txs.slice(0, 5));

      const nwQ = new NetWorthQueries(db, bookId);
      const nw = await nwQ.getCurrentNetWorth();
      setNetWorthData(nw);

      const nwHistory = await nwQ.getNetWorthHistory(12);
      setNetWorthHistory(nwHistory.map(s => s.net_worth).reverse());

      const [budgetRows, goalRows] = await Promise.all([
        new BudgetQueries(db, bookId).getByMonth(dayjs().format('YYYY-MM')),
        new SavingsGoalQueries(db, bookId).getAll(),
      ]);
      setBudgets(budgetRows as BudgetRow[]);
      setGoals(goalRows);

      const enabled = await AsyncStorage.getItem('safe_to_spend_enabled');
      setSafeToSpendEnabled(enabled !== 'false');

      const safeData = await calculateSafeToSpend(db, bookId);
      setSafeToSpendData(safeData);

      const insights = await loadInsights(db, bookId);
      setInsightData(insights);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setInitialLoad(false);
    }
  }, [db, startDate, endDate, chartType, bookId]);

  useFocusEffect(useCallback(() => {
    initPayrollPeriod().then(config => {
      if (config) {
        loadData({
          startDate: config.startDate,
          endDate: config.endDate,
          payrollEnabled: config.payrollEnabled,
          salaryDay: config.salaryDay,
          salaryCategoryId: config.salaryCategoryId,
        });
      } else {
        loadData();
      }
    });
  }, [initPayrollPeriod, loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    const config = await initPayrollPeriod();
    if (config) {
      await loadData({
        startDate: config.startDate,
        endDate: config.endDate,
        payrollEnabled: config.payrollEnabled,
        salaryDay: config.salaryDay,
        salaryCategoryId: config.salaryCategoryId,
      });
    } else {
      await loadData();
    }
    setRefreshing(false);
  };

  const formatRp = formatRupiah;

  const trend = useMemo(() => {
    const totalThis = summary.totalIncome - summary.totalExpense;
    const totalLast = lastMonthSummary.totalIncome - lastMonthSummary.totalExpense;
    const diff = totalThis - totalLast;
    const isUp = diff >= 0;
    return { diff, isUp, pct: totalLast !== 0 ? Math.abs((diff / Math.abs(totalLast)) * 100).toFixed(0) : '100' };
  }, [summary, lastMonthSummary]);

  const trendLabel = payrollPeriod ? 'dari periode gaji sebelumnya' : 'dari bulan lalu';
  const isPeriodEmpty = summary.totalIncome === 0 && summary.totalExpense === 0 && recentTransactions.length === 0;
  const cashFlowColor = cashFlow >= 0 ? theme.colors.income : theme.colors.expense;

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting(true);
      const chartQueries = new ChartQueries(db, bookId);
      const txQueries = new TransactionQueries(db, bookId);
      const [currentSummary, breakdown, allTx] = await Promise.all([
        chartQueries.getSummary(startDate, endDate),
        chartQueries.getCategoryBreakdown(startDate, endDate, chartType),
        txQueries.getByDateRange(startDate, endDate),
      ]);
      const period = startDate === dayjs(startDate).startOf('month').format('YYYY-MM-DD') && 
                      endDate === dayjs(endDate).endOf('month').format('YYYY-MM-DD')
        ? dayjs(startDate).format('MMMM YYYY')
        : `${dayjs(startDate).format('DD MMM')} - ${dayjs(endDate).format('DD MMM YYYY')}`;
      await generateAndSharePDF(allTx, { ...currentSummary, categoryBreakdown: breakdown }, period);
    } catch (e) {
      console.error('Export PDF error:', e);
      Alert.alert('Gagal', `Tidak dapat mengekspor PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  }, [db, startDate, endDate, chartType, bookId]);

  const currentChartTotal = useMemo(() => {
    return chartType === 'income' ? summary.totalIncome : summary.totalExpense;
  }, [chartType, summary]);

  if (initialLoad) return <DashboardSkeleton />;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Animated.View style={heroParallaxStyle}>
          <DashboardHero
            greeting={getGreeting()}
            dateText={dayjs().format('dddd, DD MMMM YYYY')}
            totalBalance={totalBalance}
            income={summary.totalIncome}
            expense={summary.totalExpense}
            trend={trend}
            trendLabel={trendLabel}
            payrollLabel={payrollPeriod?.label}
            exporting={exporting}
            onExport={handleExportPDF}
          />
        </Animated.View>

        <View style={styles.contentColumn}>
          <QuickActions />

          <View style={styles.body}>
            <AnimatedSection index={0}>
              <Card style={styles.periodCard}>
            <View style={styles.periodHeader}>
              <View style={styles.flex}>
                <Text style={styles.periodTitle}>Ringkasan periode</Text>
                <Text style={styles.periodSubtitle}>Pantau arus kas buku aktif</Text>
              </View>
              <View style={[styles.cashFlowBadge, { borderColor: `${cashFlowColor}40` }]}>
                <View style={[styles.cashFlowIcon, { backgroundColor: `${cashFlowColor}1A` }]}>
                  <Ionicons
                    name={cashFlow >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={cashFlowColor}
                  />
                </View>
                <View>
                  <Text style={styles.cashFlowLabel}>Arus kas</Text>
                  <Text style={[styles.cashFlowText, { color: cashFlowColor }]}>
                    {cashFlow >= 0 ? '+' : ''}{formatRupiah(cashFlow)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.periodFilter}>
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateRangeChange}
                payrollPeriod={payrollPeriod ?? undefined}
                style={styles.periodTrigger}
              />
            </View>
            {trendData.length > 1 && (
              <View style={styles.trendRow}>
                <Sparkline
                  data={trendData.map((t) => t.income - t.expense)}
                  width={104}
                  height={34}
                  color={
                    trendData[trendData.length - 1].income - trendData[trendData.length - 1].expense >= 0
                      ? theme.colors.income
                      : theme.colors.expense
                  }
                />
                <View style={styles.flex}>
                  <Text style={styles.trendTitle}>Tren bersih 6 bulan</Text>
                  <Text style={styles.trendValue}>
                    {(() => {
                      const last = trendData[trendData.length - 1];
                      const net = Math.round(last.income - last.expense);
                      return `${net >= 0 ? '+' : '-'}${formatRupiah(Math.abs(net))} bln lalu`;
                    })()}
                  </Text>
                </View>
                <Ionicons name="stats-chart-outline" size={16} color={theme.colors.textMuted} />
              </View>
            )}
              </Card>
            </AnimatedSection>

            {isPeriodEmpty && (
              <AnimatedSection index={1}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/add' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Catat transaksi pertama"
                  style={{ borderRadius: 24 }}
                >
                  <Card style={styles.emptyCard}>
                    <Animated.View style={[styles.emptyIcon, gentleFloat]}>
                      <Ionicons name="sparkles-outline" size={22} color={theme.colors.primary} />
                    </Animated.View>
                    <View style={styles.emptyCopy}>
                      <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
                      <Text style={styles.emptyText}>Mulai catat pemasukan atau pengeluaran di periode ini.</Text>
                    </View>
                    <View style={styles.emptyArrow}>
                      <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              </AnimatedSection>
            )}

            {primaryWallet && (
              <AnimatedSection index={1}>
                <Card
                  style={[
                    styles.walletCard,
                    { borderLeftColor: primaryWallet.color || theme.colors.primary },
                  ]}
                >
                  <View style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}>
                    <LinearGradient
                      colors={[
                        `${primaryWallet.color || theme.colors.primary}16`,
                        `${primaryWallet.color || theme.colors.primary}04`,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View style={[styles.pwIcon, { backgroundColor: (primaryWallet.color || theme.colors.primary) + '20' }]}>
                    <Ionicons
                      name={(primaryWallet.icon || 'wallet') as any}
                      size={18}
                      color={primaryWallet.color || theme.colors.primary}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.pwLabel}>Dompet utama</Text>
                    <Text style={styles.pwName} numberOfLines={1}>{primaryWallet.name}</Text>
                  </View>
                  <Text style={styles.pwBalance}>{formatRp(primaryWallet.balance)}</Text>
                </Card>
              </AnimatedSection>
            )}

            {safeToSpendEnabled && safeToSpendData && (
              <AnimatedSection index={2}>
                <SafeToSpendCard data={safeToSpendData} />
              </AnimatedSection>
            )}

            <AnimatedSection index={3}>
              <BudgetProgressCard budgets={budgets} />
            </AnimatedSection>

            <AnimatedSection index={4}>
              <GoalsStrip goals={goals} />
            </AnimatedSection>

            <AnimatedSection index={5}>
              <View>
                <SectionHeader title="Analisis finansial" icon="analytics-outline" />
                <AnalyticsCard
                  income={summary.totalIncome}
                  expense={summary.totalExpense}
                  chartData={chartData}
                  chartType={chartType}
                  onChartTypeChange={setChartType}
                  chartTotal={currentChartTotal}
                  trendData={trendData}
                />
              </View>
            </AnimatedSection>

            {(monthExpense.length > 0 || monthIncome.length > 0) && (
              <AnimatedSection index={6}>
                <View>
                  <SectionHeader title={`Bulan Ini · ${dayjs().format('MMMM')}`} icon="bar-chart-outline" />
                  <MonthBarsCard expense={monthExpense} income={monthIncome} />
                </View>
              </AnimatedSection>
            )}

            <AnimatedSection index={7}>
              <CollapsibleSection title="Harga Emas" subtitle="Emas per gram (Rp)" icon="diamond-outline" iconColor="#EAB308">
                <GoldPriceCard />
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection index={8}>
              <CollapsibleSection title="Dolar ke Rupiah" subtitle="Kurs tengah USD → IDR" icon="cash-outline" iconColor={theme.colors.info}>
                <UsdIdrCard />
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection index={9}>
              <CollapsibleSection title="Ekonomi Nasional" subtitle="Ekonomi Indonesia terkini" icon="newspaper-outline" iconColor={theme.colors.accent}>
                <EconNewsCarousel kind="national" />
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection index={10}>
              <CollapsibleSection title="Ekonomi Internasional" subtitle="Global economy highlights" icon="globe-outline" iconColor={theme.colors.info}>
                <EconNewsCarousel kind="international" />
              </CollapsibleSection>
            </AnimatedSection>

            {netWorthData && (
              <AnimatedSection index={11}>
                <NetWorthSummaryCard
                  totalAssets={netWorthData.totalAssets}
                  totalLiabilities={netWorthData.totalLiabilities}
                  netWorth={netWorthData.netWorth}
                  history={netWorthHistory}
                />
              </AnimatedSection>
            )}

            {insightData.financialHealth && (
              <AnimatedSection index={12}>
                <View>
                  <SectionHeader title="Kesehatan finansial" icon="heart-outline" iconColor={theme.colors.success} />
                  <FinancialTipsCard health={insightData.financialHealth} tips={insightData.financialTips} />
                </View>
              </AnimatedSection>
            )}

            <AnimatedSection index={13}>
              <SpendingInsightCard comparisons={insightData.comparisons} alerts={insightData.alerts} />
            </AnimatedSection>

            {recentTransactions.length > 0 && (
              <AnimatedSection index={14}>
                <View>
                  <SectionHeader
                    title="Transaksi terbaru"
                    icon="receipt-outline"
                    actionLabel="Lihat semua"
                    onAction={() => router.push('/(tabs)/transactions' as any)}
                  />
                  <Card style={styles.recentCard}>
                    {recentTransactions.map((tx, i) => (
                      <Animated.View
                        key={tx.id}
                        layout={shouldReduceMotion() ? undefined : LinearTransition.springify().damping(20)}
                        entering={shouldReduceMotion() ? undefined : FadeInDown.duration(280).delay(staggerDelay(i, 40))}
                      >
                        <TouchableOpacity
                          style={[styles.recentItem, i > 0 && styles.recentItemBorder]}
                          activeOpacity={0.7}
                          onPress={() => router.push(`/transaction/${tx.id}` as any)}
                        >
                          <View style={[styles.recentIcon, { backgroundColor: tx.category_color + '22' }]}>
                            <Ionicons name={tx.category_icon as any} size={18} color={tx.category_color} />
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.recentCat} numberOfLines={1}>{tx.category_name}</Text>
                            <Text style={styles.recentMeta} numberOfLines={1}>{tx.notes || tx.wallet_name}</Text>
                          </View>
                          <View style={styles.recentAmountWrap}>
                            <Text
                              style={[
                                styles.recentAmount,
                                { color: tx.type === 'income' ? theme.colors.income : theme.colors.textPrimary },
                              ]}
                            >
                              {tx.type === 'income' ? '+' : '-'}{formatRp(tx.amount)}
                            </Text>
                            <View style={[styles.txDot, { backgroundColor: tx.type === 'income' ? theme.colors.income : theme.colors.expense }]} />
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </Card>
                </View>
              </AnimatedSection>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[styles.stickyHeader, { paddingTop: insets.top + 10 }, stickyHeaderStyle]}
      >
        <View style={styles.stickyPill}>
          <View style={styles.stickyDot} />
          <Text style={styles.stickyBalance} numberOfLines={1}>
            {formatRupiahShort(totalBalance)}
          </Text>
          <Text style={[styles.stickyTrend, { color: trend.isUp ? theme.colors.income : theme.colors.expense }]}>
            {trend.isUp ? '▲' : '▼'} {trend.pct}%
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 130 },
  contentColumn: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  flex: { flex: 1 },
  body: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  periodCard: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  periodTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  periodSubtitle: { ...theme.typography.caption, marginTop: 2 },
  periodFilter: { alignItems: 'stretch' },
  periodTrigger: { width: '100%', justifyContent: 'space-between' },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trendTitle: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textPrimary },
  trendValue: { ...theme.typography.caption, marginTop: 2 },
  cashFlowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  cashFlowIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashFlowLabel: { ...theme.typography.caption, fontSize: 9 },
  cashFlowText: { ...theme.typography.bodySmall, fontWeight: '700' },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}12`,
    borderColor: `${theme.colors.primary}30`,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    marginRight: theme.spacing.md,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { ...theme.typography.body, fontWeight: '700', color: theme.colors.primary },
  emptyText: { ...theme.typography.caption, color: theme.colors.primary, opacity: 0.8, lineHeight: 18, marginTop: 4 },
  emptyArrow: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}1A`,
    marginLeft: theme.spacing.sm,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pwIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  pwLabel: { ...theme.typography.caption, fontSize: 10 },
  pwName: { ...theme.typography.body, fontWeight: '600', fontSize: 13 },
  pwBalance: { ...theme.typography.body, fontWeight: 'bold', marginLeft: theme.spacing.sm },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  recentItemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  recentIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  recentCat: { ...theme.typography.body, fontWeight: '600' },
  recentMeta: { ...theme.typography.caption },
  recentCard: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.md,
  },
  recentAmountWrap: { alignItems: 'flex-end', gap: 4, marginLeft: theme.spacing.sm },
  recentAmount: { ...theme.typography.body, fontWeight: 'bold' },
  txDot: { width: 6, height: 6, borderRadius: 3 },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingBottom: 20,
  },
  stickyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.md,
  },
  stickyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  stickyBalance: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stickyTrend: { ...theme.typography.caption, fontWeight: '700' },
});

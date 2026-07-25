import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { ChartQueries, WalletQueries, TransactionQueries } from '@/lib/queries';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { ChartToggle } from '@/components/charts/ChartToggle';
import { ExpenseDonutChart } from '@/components/charts/ExpenseDonutChart';
import { OverviewDonutChart } from '@/components/charts/OverviewDonutChart';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { Card } from '@/components/ui/Card';
import { TransactionWithDetails } from '@/types';
import { formatRupiah } from '@/utils/format';
import { generateAndSharePDF } from '@/features/export/pdfGenerator';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

dayjs.locale('id');

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function DashboardScreen() {
  const db = useSQLiteContext();
  
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  const [exporting, setExporting] = useState(false);
  
  const [totalBalance, setTotalBalance] = useState(0);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [lastMonthSummary, setLastMonthSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);

  const loadData = useCallback(async () => {
    try {
      const chartQueries = new ChartQueries(db);
      const walletQueries = new WalletQueries(db);
      const txQueries = new TransactionQueries(db);

      const wallets = await walletQueries.getAll();
      const balance = wallets.reduce((acc, w) => acc + w.balance, 0);
      setTotalBalance(balance);

      const [summaryData, prevMonthData] = await Promise.all([
        chartQueries.getSummary(startDate, endDate),
        chartQueries.getSummary(
          dayjs(startDate).subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
          dayjs(endDate).subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
        ),
      ]);
      setSummary(summaryData);
      setLastMonthSummary(prevMonthData);

      const breakdown = await chartQueries.getCategoryBreakdown(startDate, endDate, chartType);
      setChartData(breakdown.map(item => ({
        value: item.total,
        label: item.category_name,
        color: item.color,
      })));

      const txs = await txQueries.getByDateRange(startDate, endDate);
      setRecentTransactions(txs.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setInitialLoad(false);
    }
  }, [db, startDate, endDate, chartType]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting(true);
      const chartQueries = new ChartQueries(db);
      const txQueries = new TransactionQueries(db);
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
  }, [db, startDate, endDate, chartType]);

  const currentChartTotal = useMemo(() => {
    return chartType === 'income' ? summary.totalIncome : summary.totalExpense;
  }, [chartType, summary]);

  if (initialLoad) return <DashboardSkeleton />;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{dayjs().format('dddd, DD MMMM YYYY')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.exportBtn} 
            onPress={handleExportPDF}
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
          <DateRangeFilter 
            startDate={startDate} 
            endDate={endDate} 
            onChange={(start, end) => { setStartDate(start); setEndDate(end); }} 
          />
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Saldo</Text>
          <Text style={styles.balanceValue}>{formatRp(totalBalance)}</Text>
          <View style={styles.trendRow}>
            <Ionicons name={trend.isUp ? 'arrow-up' : 'arrow-down'} size={14} color={trend.isUp ? theme.colors.income : theme.colors.expense} />
            <Text style={[styles.trendText, { color: trend.isUp ? theme.colors.income : theme.colors.expense }]}>
              {trend.isUp ? '↑' : '↓'} {formatRp(Math.abs(trend.diff))} ({trend.pct}%) dari bulan lalu
            </Text>
          </View>
        </Card>
        
        <View style={styles.rowCards}>
          <Card style={[styles.halfCard, { marginRight: theme.spacing.sm }]}>
            <Text style={styles.halfCardLabel}>Pemasukan</Text>
            <Text style={[styles.halfCardValue, { color: theme.colors.income }]}>
              {formatRp(summary.totalIncome)}
            </Text>
          </Card>
          <Card style={[styles.halfCard, { marginLeft: theme.spacing.sm }]}>
            <Text style={styles.halfCardLabel}>Pengeluaran</Text>
            <Text style={[styles.halfCardValue, { color: theme.colors.expense }]}>
              {formatRp(summary.totalExpense)}
            </Text>
          </Card>
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Analisis Finansial</Text>
        
        <Card style={[styles.chartCard, { marginBottom: theme.spacing.lg }]}>
          <Text style={styles.chartTitle}>Perbandingan Pemasukan vs Pengeluaran</Text>
          <OverviewDonutChart income={summary.totalIncome} expense={summary.totalExpense} />
        </Card>

        <ChartToggle 
          options={[
            { label: 'Pemasukan', value: 'income' },
            { label: 'Pengeluaran', value: 'expense' }
          ]}
          value={chartType}
          onChange={(val: string) => setChartType(val as 'income' | 'expense')}
        />
        
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribusi Kategori</Text>
          <ExpenseDonutChart data={chartData} type={chartType} total={currentChartTotal} />
        </Card>

        <Card style={[styles.chartCard, { marginTop: theme.spacing.md }]}>
          <Text style={styles.chartTitle}>Komparasi Nominal</Text>
          <CategoryBarChart data={chartData} />
        </Card>
      </View>

      {/* Recent Transactions Preview */}
      {recentTransactions.length > 0 && (
        <View style={styles.recentSection}>
          <TouchableOpacity style={styles.recentHeader} onPress={() => router.push('/(tabs)/transactions' as any)}>
            <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
            <View style={styles.recentHeaderRight}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
          {recentTransactions.map(tx => (
            <TouchableOpacity
              key={tx.id}
              style={styles.recentItem}
              activeOpacity={0.7}
              onPress={() => router.push(`/transaction/${tx.id}` as any)}
            >
              <View style={[styles.recentIcon, { backgroundColor: tx.category_color + '20' }]}>
                <Ionicons name={tx.category_icon as any} size={20} color={tx.category_color} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentCat}>{tx.category_name}</Text>
                <Text style={styles.recentMeta} numberOfLines={1}>{tx.notes || tx.wallet_name}</Text>
              </View>
              <Text style={[styles.recentAmount, { color: tx.type === 'income' ? theme.colors.income : theme.colors.textPrimary }]}>
                {tx.type === 'income' ? '+' : '-'}{formatRp(tx.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: theme.spacing.md, paddingTop: theme.spacing.lg,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  exportBtn: {
    padding: theme.spacing.sm, borderRadius: theme.radius.round,
    backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border,
    marginRight: theme.spacing.xs,
  },
  greeting: { ...theme.typography.h2 },
  dateText: { ...theme.typography.caption, marginTop: 2 },
  summaryContainer: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  balanceCard: { marginBottom: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  balanceLabel: { ...theme.typography.bodySmall, marginBottom: 4 },
  balanceValue: { ...theme.typography.h1 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs, gap: 4 },
  trendText: { ...theme.typography.caption, fontWeight: '600' },
  rowCards: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { flex: 1 },
  halfCardLabel: { ...theme.typography.caption, marginBottom: 4 },
  halfCardValue: { ...theme.typography.subtitle, fontWeight: 'bold' },
  chartSection: { paddingHorizontal: theme.spacing.md },
  sectionTitle: { ...theme.typography.h3, marginBottom: theme.spacing.md },
  chartCard: { padding: theme.spacing.md },
  chartTitle: { ...theme.typography.body, fontWeight: 'bold', marginBottom: theme.spacing.md, textAlign: 'center' },
  recentSection: { paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.lg },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  recentHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '600' },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border,
  },
  recentIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  recentInfo: { flex: 1 },
  recentCat: { ...theme.typography.body, fontWeight: '600' },
  recentMeta: { ...theme.typography.caption },
  recentAmount: { ...theme.typography.body, fontWeight: 'bold' },
});

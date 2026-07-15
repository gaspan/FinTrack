import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';

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

export default function DashboardScreen() {
  const db = useSQLiteContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  
  const [totalBalance, setTotalBalance] = useState(0);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [, setRecentTransactions] = useState<TransactionWithDetails[]>([]);

  const loadData = useCallback(async () => {
    try {
      const chartQueries = new ChartQueries(db);
      const walletQueries = new WalletQueries(db);
      const txQueries = new TransactionQueries(db);

      // Total Balance
      const wallets = await walletQueries.getAll();
      const balance = wallets.reduce((acc, w) => acc + w.balance, 0);
      setTotalBalance(balance);

      // Summary
      const summaryData = await chartQueries.getSummary(startDate, endDate);
      setSummary(summaryData);

      // Chart Data
      const breakdown = await chartQueries.getCategoryBreakdown(startDate, endDate, chartType);
      const formattedChartData = breakdown.map(item => ({
        value: item.total,
        label: item.category_name,
        color: item.color,
      }));
      setChartData(formattedChartData);

      // Recent Transactions
      const txs = await txQueries.getByDateRange(startDate, endDate);
      setRecentTransactions(txs.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [db, startDate, endDate, chartType]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatRp = formatRupiah;

  const currentChartTotal = useMemo(() => {
    return chartType === 'income' ? summary.totalIncome : summary.totalExpense;
  }, [chartType, summary]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Halo,</Text>
        <DateRangeFilter 
          startDate={startDate} 
          endDate={endDate} 
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }} 
        />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Saldo</Text>
          <Text style={styles.balanceValue}>{formatRp(totalBalance)}</Text>
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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  greeting: {
    ...theme.typography.h2,
  },
  summaryContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  balanceCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  balanceLabel: {
    ...theme.typography.bodySmall,
    marginBottom: 4,
  },
  balanceValue: {
    ...theme.typography.h1,
  },
  rowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCard: {
    flex: 1,
  },
  halfCardLabel: {
    ...theme.typography.caption,
    marginBottom: 4,
  },
  halfCardValue: {
    ...theme.typography.subtitle,
    fontWeight: 'bold',
  },
  chartSection: {
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
  },
  chartCard: {
    padding: theme.spacing.md,
  },
  chartTitle: {
    ...theme.typography.body,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  }
});

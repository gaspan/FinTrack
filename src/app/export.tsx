import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import dayjs from 'dayjs';

import { useTheme, type Theme } from '@/constants/theme';
import { ChartQueries, TransactionQueries } from '@/lib/queries';
import { generateAndShareExcel } from '@/features/export/excelGenerator';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { Button } from '@/components/ui/Button';

export default function ExportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const handleExport = async () => {
    try {
      setLoading(true);
      const txQueries = new TransactionQueries(db);
      const chartQueries = new ChartQueries(db);
      
      const transactions = await txQueries.getByDateRange(startDate, endDate);
      
      if (transactions.length === 0) {
        Alert.alert('Info', 'Tidak ada data transaksi di rentang waktu ini untuk diekspor.');
        return;
      }

      const summary = await chartQueries.getSummary(startDate, endDate);
      
      // Get category breakdown for expense only for summary
      const expenseBreakdown = await chartQueries.getCategoryBreakdown(startDate, endDate, 'expense');
      const incomeBreakdown = await chartQueries.getCategoryBreakdown(startDate, endDate, 'income');
      
      const combinedBreakdown = [...incomeBreakdown, ...expenseBreakdown];

      const reportPeriod = `${dayjs(startDate).format('DD MMM YYYY')} - ${dayjs(endDate).format('DD MMM YYYY')}`;

      await generateAndShareExcel(
        transactions,
        {
          totalIncome: summary.totalIncome,
          totalExpense: summary.totalExpense,
          categoryBreakdown: combinedBreakdown,
        },
        reportPeriod
      );
      
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Terjadi kesalahan saat mengekspor data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ekspor Laporan Excel</Text>
      <Text style={styles.subtitle}>
        Unduh riwayat transaksi Anda dalam format .xlsx berdasarkan rentang waktu tertentu.
      </Text>

      <View style={styles.filterContainer}>
        <Text style={styles.label}>Pilih Rentang Waktu</Text>
        <DateRangeFilter 
          startDate={startDate} 
          endDate={endDate} 
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }} 
        />
      </View>

      <Button 
        title="Generate & Bagikan Excel" 
        onPress={handleExport}
        loading={loading}
        fullWidth
      />
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  filterContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  }
});

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { ChartQueries, TransactionQueries } from '@/lib/queries';
import { formatRupiah } from '@/utils/format';

dayjs.locale('id');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function AnnualReportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [year, setYear] = useState(dayjs().year());
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const chartQueries = new ChartQueries(db);
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const summary = await chartQueries.getSummary(startDate, endDate);
      setTotalIncome(summary.totalIncome);
      setTotalExpense(summary.totalExpense);

      const data: { month: string; income: number; expense: number }[] = [];
      for (let m = 0; m < 12; m++) {
        const ms = dayjs(`${year}-${m + 1}-01`).format('YYYY-MM-DD');
        const me = dayjs(`${year}-${m + 1}-01`).endOf('month').format('YYYY-MM-DD');
        const s = await chartQueries.getSummary(ms, me);
        data.push({ month: MONTHS[m], income: s.totalIncome, expense: s.totalExpense });
      }
      setMonthlyData(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [db, year]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setYear(y => y - 1)}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Laporan {year}</Text>
        <TouchableOpacity onPress={() => setYear(y => y + 1)} disabled={year >= dayjs().year()}>
          <Ionicons name="chevron-forward" size={24} color={year >= dayjs().year() ? theme.colors.textSecondary : theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Pemasukan</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.income }]}>{formatRupiah(totalIncome)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.expense }]}>{formatRupiah(totalExpense)}</Text>
            </View>
          </View>

          <View style={styles.netCard}>
            <Text style={styles.netLabel}>Selisih</Text>
            <Text style={[styles.netValue, { color: totalIncome >= totalExpense ? theme.colors.income : theme.colors.expense }]}>
              {formatRupiah(totalIncome - totalExpense)}
            </Text>
          </View>

          <View style={styles.chartContainer}>
            {monthlyData.map((d, i) => {
              const incomeH = (d.income / maxVal) * 120;
              const expenseH = (d.expense / maxVal) * 120;
              return (
                <View key={i} style={styles.barColumn}>
                  <Text style={styles.barValue}>{formatRupiah(d.income > 0 || d.expense > 0 ? Math.max(d.income, d.expense) : 0).length > 6 ? '' : formatRupiah(d.income > 0 || d.expense > 0 ? Math.max(d.income, d.expense) : 0)}</Text>
                  <View style={styles.barsGroup}>
                    <View style={[styles.bar, { height: Math.max(incomeH, 2), backgroundColor: theme.colors.income }]} />
                    <View style={[styles.bar, { height: Math.max(expenseH, 2), backgroundColor: theme.colors.expense }]} />
                  </View>
                  <Text style={styles.barLabel}>{d.month}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.income }]} />
              <Text style={styles.legendText}>Pemasukan</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.expense }]} />
              <Text style={styles.legendText}>Pengeluaran</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md },
  title: { ...theme.typography.h2 },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
  summaryCard: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  summaryLabel: { ...theme.typography.caption, marginBottom: 4 },
  summaryValue: { ...theme.typography.subtitle, fontWeight: 'bold' },
  netCard: { marginHorizontal: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated, padding: theme.spacing.md, borderRadius: theme.radius.md, alignItems: 'center', marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  netLabel: { ...theme.typography.bodySmall },
  netValue: { ...theme.typography.h2 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, height: 200, alignItems: 'flex-end' },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { ...theme.typography.caption, fontSize: 8, marginBottom: 2 },
  barsGroup: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { width: 10, borderRadius: 3, minHeight: 2 },
  barLabel: { ...theme.typography.caption, marginTop: 4, fontSize: 10 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl, marginTop: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...theme.typography.bodySmall },
});

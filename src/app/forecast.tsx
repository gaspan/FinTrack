import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { LineChart } from 'react-native-gifted-charts';
import { SafeToSpendData, ForecastPoint } from '@/types';
import { calculateSafeToSpend, generateForecast } from '@/features/forecast/forecastEngine';
import { formatRupiah } from '@/utils/format';

export default function ForecastPage() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [safeData, setSafeData] = useState<SafeToSpendData | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);

  useFocusEffect(useCallback(() => {
    calculateSafeToSpend(db).then(setSafeData);
    generateForecast(db).then(setForecast);
  }, [db]));

  const chartData = forecast.map((f) => ({
    value: f.projected_balance,
    label: f.date.slice(5),
    dataPointText: f.projected_balance >= 1000000
      ? `${(f.projected_balance / 1000000).toFixed(1)}jt` : `${(f.projected_balance / 1000).toFixed(0)}rb`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proyeksi Keuangan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {safeData && (
          <Card style={[styles.safeCard, { borderLeftColor: safeData.color, borderLeftWidth: 4 }]}>
            <Text style={styles.safeLabel}>Sisa Hari Ini</Text>
            <Text style={[styles.safeAmount, { color: safeData.color }]}>
              {formatRupiah(Math.round(safeData.safeToSpendDaily))}
            </Text>
            <Text style={styles.safeSub}>per hari (sisa {safeData.daysRemaining} hari)</Text>
            <View style={styles.divider} />
            <View style={styles.metrics}>
              <Metric label="Saldo Total" value={formatRupiah(safeData.totalBalance)} />
              <Metric label="Tagihan Mendatang" value={formatRupiah(safeData.upcomingBills)} color="#EF4444" />
              <Metric label="Alokasi Tabungan" value={formatRupiah(safeData.savingsTarget)} color="#F59E0B" />
              <Metric label="Sisa untuk Bulan Ini" value={formatRupiah(Math.round(safeData.safeToSpend))} />
            </View>
          </Card>
        )}

        <Text style={styles.chartTitle}>Proyeksi Saldo 30 Hari</Text>
        <Card style={styles.chartCard}>
          {chartData.length > 0 && (
            <LineChart
              data={chartData}
              color="#6366F1"
              thickness={2}
              startFillColor="#6366F1"
              endFillColor="#6366F1"
              startOpacity={0.15}
              endOpacity={0.03}
              dataPointsColor="#6366F1"
              dataPointsRadius={3}
              textFontSize={10}
              textColor={theme.colors.textSecondary}
              xAxisColor={theme.colors.border}
              yAxisColor={theme.colors.border}
              yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 9 }}
              height={200}
              spacing={Math.max(30, 60)}
              scrollToEnd
              isAnimated
            />
          )}
        </Card>

        <Text style={styles.chartTitle}>Rincian Harian</Text>
        {forecast.slice(0, 14).map((f, idx) => (
          <View key={idx} style={styles.forecastRow}>
            <Text style={styles.forecastDate}>{f.date}</Text>
            <Text style={[styles.forecastVal, { color: f.income > 0 ? '#10B981' : '#9CA3AF' }]}>
              +{f.income ? formatRupiah(f.income) : '-'}
            </Text>
            <Text style={[styles.forecastVal, { color: f.expense > 0 ? '#EF4444' : '#9CA3AF' }]}>
              -{f.expense ? formatRupiah(f.expense) : '-'}
            </Text>
            <Text style={[styles.forecastBalance, { color: f.projected_balance >= 0 ? '#10B981' : '#EF4444' }]}>
              {formatRupiah(f.projected_balance)}
            </Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const Metric = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={metricStyles.row}>
    <Text style={metricStyles.label}>{label}</Text>
    <Text style={[metricStyles.value, color ? { color } : undefined]}>{value}</Text>
  </View>
);

const metricStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { fontSize: 13, color: '#9CA3AF' },
  value: { fontSize: 13, fontWeight: '600' },
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2 },
  scroll: { padding: theme.spacing.lg },
  safeCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.lg, backgroundColor: theme.colors.surfaceElevated },
  safeLabel: { fontSize: 13, color: theme.colors.textSecondary },
  safeAmount: { fontSize: 28, fontWeight: '800', marginVertical: 4 },
  safeSub: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  metrics: { gap: 2 },
  chartTitle: { ...theme.typography.subtitle, marginBottom: theme.spacing.sm },
  chartCard: { padding: theme.spacing.md, marginBottom: theme.spacing.lg, backgroundColor: theme.colors.surfaceElevated },
  forecastRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  forecastDate: { flex: 1, fontSize: 12, color: theme.colors.textSecondary },
  forecastVal: { width: 90, fontSize: 12, textAlign: 'right' },
  forecastBalance: { width: 110, fontSize: 12, textAlign: 'right', fontWeight: '600' },
});
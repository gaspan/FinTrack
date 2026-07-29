import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { SafeToSpendData } from '@/types';
import { formatRupiah } from '@/utils/format';

interface SafeToSpendCardProps {
  data: SafeToSpendData;
}

export const SafeToSpendCard: React.FC<SafeToSpendCardProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const statusLabel = data.status === 'healthy' ? 'Aman' : data.status === 'caution' ? 'Hati-hati' : 'Terbatas';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/forecast' as any)}>
      <Card style={[styles.card, { borderLeftColor: data.color, borderLeftWidth: 4 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Sisa Hari Ini</Text>
          <Text style={[styles.status, { color: data.color }]}>{statusLabel}</Text>
        </View>
        <Text style={[styles.amount, { color: data.color }]}>{formatRupiah(Math.round(data.safeToSpendDaily))}</Text>
        <Text style={styles.sub}>per hari (sisa {data.daysRemaining} hari)</Text>
        <View style={styles.divider} />
        <View style={styles.metrics}>
          <Metric label="Saldo Total" value={formatRupiah(data.totalBalance)} />
          <Metric label="Tagihan Mendatang" value={formatRupiah(data.upcomingBills)} color="#EF4444" />
          <Metric label="Alokasi Tabungan" value={formatRupiah(data.savingsTarget)} color="#F59E0B" />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const Metric = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={metricStyles.row}>
    <Text style={metricStyles.label}>{label}</Text>
    <Text style={[metricStyles.value, color ? { color } : undefined]}>{value}</Text>
  </View>
);

const metricStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  label: { fontSize: 12, color: '#9CA3AF' },
  value: { fontSize: 12, fontWeight: '600' },
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: { marginBottom: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...theme.typography.subtitle },
  status: { fontSize: 11, fontWeight: '700' },
  amount: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 8 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  metrics: { gap: 2 },
});
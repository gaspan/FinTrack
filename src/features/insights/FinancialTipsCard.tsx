import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { FinancialHealthScore, FinancialTip } from '@/types';
import { formatRupiah } from '@/utils/format';
import { Card } from '@/components/ui/Card';

interface FinancialTipsCardProps {
  health: FinancialHealthScore;
  tips: FinancialTip[];
}

export const FinancialTipsCard: React.FC<FinancialTipsCardProps> = ({ health, tips }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { score, label, color, metrics } = health;

  const scoreRingSize = 64;
  const scoreStrokeWidth = 5;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Kesehatan Finansial</Text>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View style={styles.scoreMeta}>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          <View style={styles.metricsMini}>
            <MetricLine label="Tabungan" value={`${metrics.savingsRate.toFixed(0)}%`} target={20} color={theme} />
            <MetricLine label="Dana Darurat" value={metrics.emergencyFundMonths.toFixed(1)} suffix=" bln" target={3} color={theme} />
            <MetricLine label="Pengeluaran" value={`${metrics.expenseRatio.toFixed(0)}%`} suffix=" income" target={80} inverse color={theme} />
          </View>
        </View>
      </View>

      <View style={styles.ratioRow}>
        <RatioBlock label="Kebutuhan" pct={metrics.needsPct.toFixed(0)} ideal="50" color={theme.colors.primary} />
        <RatioBlock label="Keinginan" pct={metrics.wantsPct.toFixed(0)} ideal="30" color="#F59E0B" />
        <RatioBlock label="Tabungan" pct={metrics.savingsPct.toFixed(0)} ideal="20" color="#10B981" />
      </View>

      <View style={styles.divider} />

      <Text style={styles.tipsTitle}>Tips untukmu</Text>
      {tips.map((tip, idx) => (
        <View key={idx} style={styles.tipItem}>
          <Ionicons
            name={tip.icon as any}
            size={16}
            color={tip.priority === 'high' ? '#EF4444' : tip.priority === 'medium' ? '#F59E0B' : '#6366f1'}
            style={styles.tipIcon}
          />
          <Text style={styles.tipText}>{tip.message}</Text>
        </View>
      ))}
    </Card>
  );
};

const MetricLine = ({ label, value, suffix = '%', target, color, inverse }: { label: string; value: string; suffix?: string; target: number; color: Theme; inverse?: boolean }) => {
  const isGood = inverse ? Number.parseFloat(value) <= target : Number.parseFloat(value) >= target;
  return (
    <View style={metricStyles.row}>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={[metricStyles.value, { color: isGood ? '#10B981' : '#F59E0B' }]}>{value}{suffix}</Text>
    </View>
  );
};

const metricStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 11, color: '#9CA3AF', flex: 1 },
  value: { fontSize: 11, fontWeight: '700' },
});

const RatioBlock = ({ label, pct, ideal, color }: { label: string; pct: string; ideal: string; color: string }) => (
  <View style={ratioStyles.block}>
    <Text style={ratioStyles.pct} numberOfLines={1}>{pct}%</Text>
    <Text style={ratioStyles.label}>{label}</Text>
    <Text style={ratioStyles.ideal}>/{ideal}%</Text>
  </View>
);

const ratioStyles = StyleSheet.create({
  block: { flex: 1, alignItems: 'center' },
  pct: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  ideal: { fontSize: 9, color: '#6B7280' },
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  title: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  scoreCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  scoreOutOf: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  scoreMeta: {
    flex: 1,
  },
  scoreLabel: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  metricsMini: {
    gap: 3,
  },
  ratioRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  tipsTitle: {
    ...theme.typography.subtitle,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
});
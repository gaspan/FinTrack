import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { FinancialHealthScore, FinancialTip } from '@/types';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface FinancialTipsCardProps {
  health: FinancialHealthScore;
  tips: FinancialTip[];
}

export const FinancialTipsCard: React.FC<FinancialTipsCardProps> = ({ health, tips }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { score, label, color, metrics } = health;

  const good = theme.colors.success;
  const warn = theme.colors.warning;

  const metricLine = (
    key: string,
    label: string,
    value: number,
    display: string,
    target: number,
    inverse?: boolean
  ) => {
    const isGood = inverse ? value <= target : value >= target;
    return (
      <View key={key} style={styles.metricRow}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: isGood ? good : warn }]}>{display}</Text>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.scoreRow}>
        <ProgressRing
          progress={score}
          size={72}
          strokeWidth={6}
          color={color}
          label={String(score)}
          sublabel="/100"
        />
        <View style={styles.scoreMeta}>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          <View style={styles.metricsMini}>
            {metricLine('sav', 'Tabungan', metrics.savingsRate, `${metrics.savingsRate.toFixed(0)}%`, 20)}
            {metricLine('ef', 'Dana Darurat', metrics.emergencyFundMonths, `${metrics.emergencyFundMonths.toFixed(1)} bln`, 3)}
            {metricLine('exp', 'Pengeluaran', metrics.expenseRatio, `${metrics.expenseRatio.toFixed(0)}%`, 80, true)}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Alokasi 50/30/20</Text>
      <View style={styles.ratioRow}>
        <RatioBlock label="Kebutuhan" pct={metrics.needsPct} ideal={50} color={theme.colors.primary} />
        <RatioBlock label="Keinginan" pct={metrics.wantsPct} ideal={30} color={theme.colors.warning} />
        <RatioBlock label="Tabungan" pct={metrics.savingsPct} ideal={20} color={theme.colors.success} />
      </View>

      {tips.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Tips untukmu</Text>
          {tips.map((tip, idx) => (
            <View key={idx} style={styles.tipItem}>
              <Ionicons
                name={tip.icon as any}
                size={15}
                color={
                  tip.priority === 'high'
                    ? theme.colors.danger
                    : tip.priority === 'medium'
                      ? theme.colors.warning
                      : theme.colors.accent
                }
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>{tip.message}</Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
};

const RatioBlock = ({
  label,
  pct,
  ideal,
  color,
}: {
  label: string;
  pct: number;
  ideal: number;
  color: string;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.ratioBlock}>
      <Text style={[styles.ratioPct, { color }]} numberOfLines={1}>
        {pct.toFixed(0)}%
      </Text>
      <ProgressBar progress={Math.min(pct, 100)} color={color} height={5} />
      <Text style={styles.ratioLabel}>{label}</Text>
      <Text style={styles.ratioIdeal}>ideal {ideal}%</Text>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: { padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  scoreMeta: { flex: 1 },
  scoreLabel: { ...theme.typography.subtitle, fontWeight: '700', marginBottom: 6 },
  metricsMini: { gap: 3 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metricLabel: { ...theme.typography.caption, fontSize: 11, flex: 1 },
  metricValue: { ...theme.typography.caption, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },
  sectionLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  ratioRow: { flexDirection: 'row', gap: theme.spacing.md },
  ratioBlock: { flex: 1 },
  ratioPct: { ...theme.typography.subtitle, fontWeight: '800', marginBottom: 4 },
  ratioLabel: { ...theme.typography.caption, fontSize: 10, marginTop: 4 },
  ratioIdeal: { ...theme.typography.caption, fontSize: 9, color: theme.colors.textMuted },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tipIcon: { marginTop: 2 },
  tipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
});

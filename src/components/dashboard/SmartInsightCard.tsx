import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatRupiah } from '@/utils/format';
import { hapticLight } from '@/utils/haptic';
import { shouldReduceMotion } from '@/utils/motion';
import type {
  CategoryInsight,
  SpendingAlert,
  FinancialHealthScore,
  FinancialTip,
} from '@/types';

interface SmartInsightCardProps {
  health: FinancialHealthScore | null;
  tips: FinancialTip[];
  comparisons: CategoryInsight[];
  alerts: SpendingAlert[];
}

const SEVERITY_ORDER: Record<SpendingAlert['severity'], number> = { high: 0, medium: 1, low: 2 };

/**
 * Menggabungkan skor kesehatan finansial, peringatan, dan perbandingan kategori
 * ke satu kartu. Ringkasan selalu terlihat; detail dibuka on-demand agar
 * tidak membanjiri dashboard dengan teks.
 */
export const SmartInsightCard: React.FC<SmartInsightCardProps> = ({
  health,
  tips,
  comparisons,
  alerts,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = shouldReduceMotion();

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [alerts]
  );
  const topComparisons = useMemo(
    () => [...comparisons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4),
    [comparisons]
  );
  const topTip = tips[0] ?? null;

  if (!health && sortedAlerts.length === 0 && topComparisons.length === 0) return null;

  const severityColor = (s: SpendingAlert['severity']) =>
    s === 'high' ? theme.colors.danger : s === 'medium' ? theme.colors.warning : theme.colors.info;

  const highCount = sortedAlerts.filter(a => a.severity === 'high').length;
  const badgeColor = highCount > 0 ? theme.colors.danger : theme.colors.warning;

  return (
    <View>
      <SectionHeader
        title="Wawasan & Kesehatan"
        icon="pulse-outline"
        iconColor={theme.colors.success}
      />
      <Animated.View layout={reduceMotion ? undefined : LinearTransition.springify().damping(24).stiffness(200)}>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.head}
            activeOpacity={0.8}
            onPress={() => { hapticLight(); setExpanded(v => !v); }}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={`Wawasan finansial, ${expanded ? 'tutup' : 'buka'}`}
          >
            {health && (
              <ProgressRing
                progress={health.score}
                size={62}
                strokeWidth={6}
                color={health.color}
                label={String(health.score)}
              />
            )}

            <View style={styles.headCopy}>
              {health && (
                <>
                  <Text style={styles.healthLabel}>{health.label}</Text>
                  <Text style={styles.healthMeta} numberOfLines={1}>
                    Tabungan {health.metrics.savingsRate.toFixed(0)}% · Darurat{' '}
                    {health.metrics.emergencyFundMonths.toFixed(1)} bln
                  </Text>
                </>
              )}
              {sortedAlerts.length > 0 && (
                <View style={styles.alertPreview}>
                  <View style={[styles.countPill, { backgroundColor: `${badgeColor}1F` }]}>
                    <Ionicons name="alert-circle" size={11} color={badgeColor} />
                    <Text style={[styles.countText, { color: badgeColor }]}>{sortedAlerts.length}</Text>
                  </View>
                  <Text style={styles.alertPreviewText} numberOfLines={1}>
                    {sortedAlerts[0].message}
                  </Text>
                </View>
              )}
            </View>

            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {expanded && (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.duration(260).springify().damping(22)}
              exiting={reduceMotion ? undefined : FadeOut.duration(140)}
            >
              {sortedAlerts.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Peringatan</Text>
                  {sortedAlerts.map((a, i) => (
                    <View
                      key={`${a.type}-${a.category_id ?? i}`}
                      style={[styles.alertRow, { borderLeftColor: severityColor(a.severity) }]}
                    >
                      <Text style={styles.alertText}>{a.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              {topComparisons.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Perbandingan bulanan</Text>
                  {topComparisons.map(c => {
                    const up = c.trend === 'up';
                    const color = up ? theme.colors.expense : theme.colors.income;
                    const ratio = c.prev_total > 0
                      ? Math.min(100, (c.current_total / c.prev_total) * 100)
                      : 100;
                    return (
                      <View key={c.category_id} style={styles.cmpRow}>
                        <View style={styles.cmpHead}>
                          <Text style={styles.cmpName} numberOfLines={1}>{c.category_name}</Text>
                          <View style={styles.cmpBadge}>
                            <Ionicons
                              name={up ? 'arrow-up' : 'arrow-down'}
                              size={10}
                              color={color}
                            />
                            <Text style={[styles.cmpPct, { color }]}>
                              {Math.abs(c.delta_percentage).toFixed(0)}%
                            </Text>
                          </View>
                        </View>
                        <ProgressBar progress={ratio} color={color} height={5} />
                        <Text style={styles.cmpAmount}>
                          {formatRupiah(c.current_total)}
                          <Text style={styles.cmpPrev}> vs {formatRupiah(c.prev_total)}</Text>
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {topTip && (
                <View style={[styles.block, styles.tipBox]}>
                  <Ionicons name={topTip.icon as any} size={15} color={theme.colors.primary} />
                  <Text style={styles.tipText}>{topTip.message}</Text>
                </View>
              )}
            </Animated.View>
          )}
        </Card>
      </Animated.View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headCopy: { flex: 1 },
  healthLabel: { ...theme.typography.body, fontWeight: '700', color: theme.colors.textPrimary },
  healthMeta: { ...theme.typography.caption, marginTop: 1 },
  alertPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.round,
  },
  countText: { ...theme.typography.caption, fontSize: 10, fontWeight: '800' },
  alertPreviewText: { ...theme.typography.caption, flex: 1 },
  block: { marginTop: theme.spacing.md },
  blockTitle: {
    ...theme.typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  alertRow: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    paddingVertical: 5,
    marginBottom: 5,
  },
  alertText: { ...theme.typography.bodySmall, color: theme.colors.textPrimary },
  cmpRow: { marginBottom: theme.spacing.sm },
  cmpHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cmpName: { ...theme.typography.bodySmall, fontWeight: '600', flex: 1, marginRight: theme.spacing.sm },
  cmpBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cmpPct: { ...theme.typography.caption, fontWeight: '800' },
  cmpAmount: { ...theme.typography.caption, marginTop: 3 },
  cmpPrev: { color: theme.colors.textMuted },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: `${theme.colors.primary}12`,
  },
  tipText: { ...theme.typography.bodySmall, flex: 1, color: theme.colors.textPrimary, lineHeight: 18 },
});

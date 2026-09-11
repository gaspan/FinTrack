import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { formatRupiah, formatRupiahShort } from '@/utils/format';
import { EmptyState } from '../ui/EmptyState';

export interface BudgetBulletDataPoint {
  id: number;
  categoryName: string;
  categoryColor: string;
  actual: number;
  budget: number;
  rollover?: number;
}

interface BudgetBulletChartProps {
  data: BudgetBulletDataPoint[];
  showTop?: number;
}

/**
 * Budget vs. Actual Progress Bullet Chart
 * 
 * Displays horizontal segmented bars where:
 * - Background track = budget limit
 * - Inner fill = actual spending
 * - Dynamic color coding:
 *   • Green: <75% of budget
 *   • Yellow: 75-90% of budget
 *   • Red: >90% or overbudget
 * 
 * Transforms redundant horizontal bar charts into actionable budget visualization.
 */
export const BudgetBulletChart: React.FC<BudgetBulletChartProps> = ({
  data,
  showTop = 6,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          title="Tidak ada anggaran"
          message="Buat anggaran kategori untuk memulai tracking"
          icon="wallet-outline"
        />
      </View>
    );
  }

  // Sort by spending percentage (descending) to show highest priority first
  const sorted = [...data]
    .sort((a, b) => {
      const effectiveBudgetA = a.budget + (a.rollover || 0);
      const effectiveBudgetB = b.budget + (b.rollover || 0);
      const pctA = effectiveBudgetA > 0 ? (a.actual / effectiveBudgetA) * 100 : 0;
      const pctB = effectiveBudgetB > 0 ? (b.actual / effectiveBudgetB) * 100 : 0;
      return pctB - pctA; // Highest percentage first
    })
    .slice(0, showTop);

  // Calculate total stats
  const totalBudget = sorted.reduce((sum, item) => sum + item.budget + (item.rollover || 0), 0);
  const totalActual = sorted.reduce((sum, item) => sum + item.actual, 0);
  const overallPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const overallColor = getStatusColor(overallPct, theme);

  return (
    <View style={styles.container}>
      {/* Overall Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Anggaran</Text>
          <Text style={styles.summaryValue}>{formatRupiahShort(totalActual)} / {formatRupiahShort(totalBudget)}</Text>
        </View>
        <View style={[styles.overallProgressTrack, { backgroundColor: theme.colors.surfaceElevated }]}>
          <View
            style={[
              styles.overallProgressFill,
              {
                width: `${Math.min(overallPct, 100)}%`,
                backgroundColor: overallColor,
              },
            ]}
          />
        </View>
        <View style={styles.overallStatsRow}>
          <Text style={styles.overallStat}>{overallPct.toFixed(1)}% digunakan</Text>
          <Text style={[styles.overallStat, { color: overallColor }]}>
            {totalBudget > totalActual
              ? `Sisa ${formatRupiahShort(totalBudget - totalActual)}`
              : `Melebihi ${formatRupiahShort(totalActual - totalBudget)}`}
          </Text>
        </View>
      </View>

      {/* Individual Bullet Charts */}
      <Card style={styles.card}>
        {sorted.map((item, index) => {
          const effectiveBudget = item.budget + (item.rollover || 0);
          const pct = effectiveBudget > 0 ? (item.actual / effectiveBudget) * 100 : 0;
          const statusColor = getStatusColor(pct, theme);
          const isOverbudget = item.actual > effectiveBudget;

          return (
            <View key={item.id} style={index > 0 ? styles.itemSpaced : undefined}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryNameRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: item.categoryColor || theme.colors.primary },
                    ]}
                  />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.categoryName}
                  </Text>
                </View>
                <View style={styles.percentageRow}>
                  <Text style={[styles.percentage, { color: statusColor }]}>
                    {pct.toFixed(0)}%
                  </Text>
                  {isOverbudget && (
                    <Text style={[styles.overBudgetBadge, { color: theme.colors.danger }]}>
                      ↑ {formatRupiahShort(item.actual - effectiveBudget)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Bullet Progress Bar */}
              <View style={[styles.bulletTrack, { backgroundColor: theme.colors.surfaceElevated }]}>
                <View
                  style={[
                    styles.bulletFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>

              {/* Amount Labels */}
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>
                  {formatRupiah(item.actual)}
                </Text>
                <Text style={[styles.budgetLabel, { color: theme.colors.textSecondary }]}>
                  / {formatRupiah(effectiveBudget)}
                </Text>
                {item.rollover ? (
                  <Text style={[styles.rolloverLabel, { color: theme.colors.income }]}>
                    +{formatRupiahShort(item.rollover)}
                  </Text>
                ) : null}
              </View>

              {/* Status Indicator */}
              <View style={styles.statusRow}>
                {pct >= 100 ? (
                  <Text style={[styles.statusText, { color: theme.colors.danger }]}>
                    ⚠️ Melampaui budget
                  </Text>
                ) : pct >= 90 ? (
                  <Text style={[styles.statusText, { color: theme.colors.warning }]}>
                    ⚡ Mendekati batas
                  </Text>
                ) : pct >= 75 ? (
                  <Text style={[styles.statusText, { color: theme.colors.warning }]}>
                    ℹ️ 75% terpakai
                  </Text>
                ) : (
                  <Text style={[styles.statusText, { color: theme.colors.income }]}>
                    ✓ Aman
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </Card>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.colors.income }]} />
          <Text style={styles.legendText}>Aman (&lt;75%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.colors.warning }]} />
          <Text style={styles.legendText}>Hati-hati (75-90%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.colors.danger }]} />
          <Text style={styles.legendText}>Overbudget (≥90%)</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Determine status color based on budget percentage
 */
const getStatusColor = (pct: number, theme: Theme): string => {
  if (pct >= 100) return theme.colors.danger;
  if (pct >= 90) return theme.colors.expense;
  if (pct >= 75) return theme.colors.warning;
  return theme.colors.income;
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { paddingVertical: theme.spacing.md },
  emptyContainer: { height: 200, justifyContent: 'center' },
  summarySection: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  overallProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  overallStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallStat: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
  card: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  itemSpaced: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.sm,
  },
  categoryName: {
    ...theme.typography.body,
    fontWeight: '600',
    flex: 1,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentage: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
  },
  overBudgetBadge: {
    ...theme.typography.caption,
    fontSize: 9,
    fontWeight: '600',
  },
  bulletTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bulletFill: {
    height: '100%',
    borderRadius: 5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  amountLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  budgetLabel: {
    ...theme.typography.caption,
    fontSize: 9,
  },
  rolloverLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    fontWeight: '600',
  },
  statusRow: {
    marginBottom: 0,
  },
  statusText: {
    ...theme.typography.caption,
    fontSize: 9,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    ...theme.typography.caption,
    fontSize: 9,
  },
});

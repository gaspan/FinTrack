import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { CategoryInsight, SpendingAlert } from '@/types';
import { formatRupiah } from '@/utils/format';
import { Card } from '@/components/ui/Card';

interface SpendingInsightCardProps {
  comparisons: CategoryInsight[];
  alerts: SpendingAlert[];
}

export const SpendingInsightCard: React.FC<SpendingInsightCardProps> = ({ comparisons, alerts }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (comparisons.length === 0 && alerts.length === 0) return null;

  return (
    <View>
      {alerts.length > 0 && (
        <Card style={styles.alertCard}>
          <Text style={styles.cardTitle}>Peringatan</Text>
          {alerts.map((alert, idx) => (
            <View key={idx} style={[styles.alertItem, { borderLeftColor: alert.severity === 'high' ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#6366f1' }]}>
              <Ionicons
                name={alert.type === 'deficit' ? 'warning' : alert.type === 'anomaly' ? 'trending-up' : 'alert-circle'}
                size={18}
                color={alert.severity === 'high' ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#6366f1'}
              />
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </Card>
      )}

      {comparisons.length > 0 && (
        <Card style={styles.compCard}>
          <Text style={styles.cardTitle}>Perbandingan Bulanan</Text>
          {comparisons.slice(0, 5).map(comp => {
            const isUp = comp.trend === 'up';
            const pct = Number.isFinite(comp.delta_percentage) ? Math.abs(comp.delta_percentage) : 0;
            const barWidth = Math.min(pct, 100);
            const delta = Number.isFinite(comp.delta) ? comp.delta : 0;
            return (
              <View key={comp.category_id} style={styles.compItem}>
                <View style={styles.compHeader}>
                  <Text style={styles.compCategory}>{comp.category_name}</Text>
                  <View style={[styles.compBadge, { backgroundColor: isUp ? '#FEE2E2' : '#D1FAE5' }]}>
                    <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={12} color={isUp ? '#EF4444' : '#10B981'} />
                    <Text style={[styles.compPct, { color: isUp ? '#EF4444' : '#10B981' }]}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.compBarBg}>
                  <View style={[styles.compBar, { width: `${barWidth}%`, backgroundColor: isUp ? '#FCA5A5' : '#6EE7B7' }]} />
                </View>
                <Text style={styles.compDetail}>
                  {isUp ? '↑' : '↓'} {formatRupiah(Math.abs(delta))} dari bulan lalu
                </Text>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  alertCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  compCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  cardTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: 3,
    marginBottom: theme.spacing.xs,
  },
  alertText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  compItem: {
    marginBottom: theme.spacing.md,
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compCategory: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  compBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.round,
  },
  compPct: {
    ...theme.typography.caption,
    fontWeight: 'bold',
    fontSize: 11,
  },
  compBarBg: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  compBar: {
    height: '100%',
    borderRadius: 3,
  },
  compDetail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
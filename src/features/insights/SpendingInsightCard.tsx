import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { CategoryInsight, SpendingAlert } from '@/types';
import { formatRupiah } from '@/utils/format';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface SpendingInsightCardProps {
  comparisons: CategoryInsight[];
  alerts: SpendingAlert[];
}

export const SpendingInsightCard: React.FC<SpendingInsightCardProps> = ({ comparisons, alerts }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  if (comparisons.length === 0 && alerts.length === 0) return null;

  const severityColor = (s: SpendingAlert['severity']) =>
    s === 'high' ? theme.colors.danger : s === 'medium' ? theme.colors.warning : theme.colors.accent;

  const count = alerts.length + comparisons.length;

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={alerts.length > 0 ? 'alert-circle' : 'bulb-outline'}
          size={18}
          color={alerts.length > 0 ? theme.colors.warning : theme.colors.primary}
        />
        <Text style={styles.title}>Wawasan Finansial</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {!expanded && alerts.length > 0 && (
        <Text style={styles.preview} numberOfLines={2}>{alerts[0].message}</Text>
      )}

      {expanded && (
        <View style={styles.body}>
          {alerts.map((alert, idx) => {
            const color = severityColor(alert.severity);
            return (
              <View key={idx} style={[styles.alertItem, { borderLeftColor: color }]}>
                <Ionicons
                  name={
                    alert.type === 'deficit'
                      ? 'warning'
                      : alert.type === 'anomaly'
                        ? 'trending-up'
                        : 'alert-circle'
                  }
                  size={16}
                  color={color}
                />
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            );
          })}

          {comparisons.length > 0 && (
            <>
              <Text style={styles.subTitle}>Perbandingan Bulanan</Text>
              {comparisons.slice(0, 5).map((comp) => {
                const isUp = comp.trend === 'up';
                const pct = Number.isFinite(comp.delta_percentage)
                  ? Math.abs(comp.delta_percentage)
                  : 0;
                const delta = Number.isFinite(comp.delta) ? comp.delta : 0;
                const color = isUp ? theme.colors.expense : theme.colors.success;
                return (
                  <View key={comp.category_id} style={styles.compItem}>
                    <View style={styles.compHeader}>
                      <Text style={styles.compCategory} numberOfLines={1}>
                        {comp.category_name}
                      </Text>
                      <View style={[styles.compBadge, { backgroundColor: `${color}22` }]}>
                        <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={11} color={color} />
                        <Text style={[styles.compPct, { color }]}>{pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                    <ProgressBar progress={Math.min(pct, 100)} color={color} height={6} />
                    <Text style={styles.compDetail}>
                      {formatRupiah(Math.abs(delta))} dari bulan lalu
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}
    </Card>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: { padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...theme.typography.subtitle, flex: 1, color: theme.colors.textPrimary },
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.track,
    alignItems: 'center',
  },
  countText: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.textSecondary },
  preview: { ...theme.typography.bodySmall, marginTop: theme.spacing.sm },
  body: { marginTop: theme.spacing.md },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: 3,
    marginBottom: theme.spacing.xs,
  },
  alertText: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, flex: 1 },
  subTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  compItem: { marginBottom: theme.spacing.md },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: theme.spacing.sm,
  },
  compCategory: { ...theme.typography.body, fontWeight: '600', flex: 1 },
  compBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.round,
  },
  compPct: { ...theme.typography.caption, fontWeight: 'bold', fontSize: 11 },
  compDetail: { ...theme.typography.caption, marginTop: 4 },
});

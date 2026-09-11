import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatRupiah } from '@/utils/format';
import { formatDueLabel, type UpcomingItem } from '@/features/dashboard/upcomingBills';

const ROUTE_BY_SOURCE: Record<UpcomingItem['source'], string> = {
  recurring: '/recurring',
  bill: '/reminders',
  subscription: '/subscriptions',
};

interface UpcomingBillsCardProps {
  items: UpcomingItem[];
  limit?: number;
}

export const UpcomingBillsCard: React.FC<UpcomingBillsCardProps> = ({ items, limit = 4 }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (items.length === 0) return null;

  const shown = items.slice(0, limit);
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = items.filter(i => i.isOverdue).length;

  const tint = (item: UpcomingItem) => {
    if (item.isOverdue) return theme.colors.danger;
    if (item.daysUntil <= 1) return theme.colors.warning;
    return item.color || theme.colors.primary;
  };

  return (
    <View>
      <SectionHeader
        title="Tagihan Mendatang"
        icon="alarm-outline"
        iconColor={overdueCount > 0 ? theme.colors.danger : theme.colors.warning}
        actionLabel="Kelola"
        onAction={() => router.push('/reminders' as any)}
      />
      <Card style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {items.length} tagihan · 7 hari
            {overdueCount > 0 ? ` · ${overdueCount} terlewat` : ''}
          </Text>
          <Text style={styles.summaryTotal}>{formatRupiah(total)}</Text>
        </View>

        {shown.map((item, i) => {
          const color = tint(item);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.row, i > 0 && styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => router.push(ROUTE_BY_SOURCE[item.source] as any)}
            >
              <View style={[styles.icon, { backgroundColor: `${color}1F` }]}>
                <Ionicons name={item.icon as any} size={16} color={color} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>{item.label}</Text>
                <Text style={[styles.due, item.isOverdue && { color: theme.colors.danger }]}>
                  {formatDueLabel(item.daysUntil)}
                </Text>
              </View>
              <Text style={styles.amount}>{formatRupiah(item.amount)}</Text>
            </TouchableOpacity>
          );
        })}

        {items.length > limit && (
          <Text style={styles.more}>+{items.length - limit} tagihan lainnya</Text>
        )}
      </Card>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  flex: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryLabel: { ...theme.typography.caption, flex: 1, marginRight: theme.spacing.sm },
  summaryTotal: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  icon: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  name: { ...theme.typography.body, fontWeight: '600' },
  due: { ...theme.typography.caption, marginTop: 1 },
  amount: { ...theme.typography.body, fontWeight: '700', marginLeft: theme.spacing.sm },
  more: { ...theme.typography.caption, textAlign: 'center', marginTop: theme.spacing.sm },
});

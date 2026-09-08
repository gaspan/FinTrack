import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { shouldReduceMotion, staggerDelay } from '@/utils/motion';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatRupiah } from '@/utils/format';

export interface BudgetRow {
  id: number;
  category_name: string;
  color: string;
  monthly_limit: number;
  spent: number;
  rollover_amount?: number;
}

interface BudgetProgressCardProps {
  budgets: BudgetRow[];
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({ budgets }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (budgets.length === 0) return null;

  const statusColor = (pct: number) => {
    if (pct >= 100) return theme.colors.danger;
    if (pct >= 90) return theme.colors.expense;
    if (pct >= 70) return theme.colors.warning;
    return theme.colors.primary;
  };

  const top = [...budgets]
    .sort((a, b) => {
      const la = a.monthly_limit + (a.rollover_amount || 0);
      const lb = b.monthly_limit + (b.rollover_amount || 0);
      return b.spent / (la || 1) - a.spent / (lb || 1);
    })
    .slice(0, 3);

  return (
    <View>
      <SectionHeader
        title="Anggaran Bulan Ini"
        icon="wallet-outline"
        actionLabel="Lihat Semua"
        onAction={() => router.push('/(tabs)/budget' as any)}
      />
      <Card style={styles.card}>
        {top.map((b, i) => {
          const effectiveLimit = b.monthly_limit + (b.rollover_amount || 0);
          const pct = effectiveLimit > 0 ? (b.spent / effectiveLimit) * 100 : 0;
          const color = statusColor(pct);
          return (
            <Animated.View
              key={b.id}
              style={i > 0 ? styles.rowSpaced : undefined}
              entering={shouldReduceMotion() ? undefined : FadeInDown.duration(300).delay(staggerDelay(i, 60))}
            >
              <View style={styles.labelRow}>
                <View style={styles.nameWrap}>
                  <View style={[styles.categoryDot, { backgroundColor: b.color || theme.colors.primary }]} />
                  <Text style={styles.name} numberOfLines={1}>{b.category_name}</Text>
                </View>
                <View style={styles.pctWrap}>
                  {pct >= 90 && (
                    <Ionicons
                      name={pct >= 100 ? 'alert-circle' : 'warning'}
                      size={12}
                      color={color}
                    />
                  )}
                  <Text style={[styles.pct, { color }]}>{pct.toFixed(0)}%</Text>
                </View>
              </View>
              <ProgressBar progress={pct} color={color} height={7} />
              <Text style={styles.amount}>
                {formatRupiah(b.spent)} / {formatRupiah(effectiveLimit)}
              </Text>
            </Animated.View>
          );
        })}
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
  rowSpaced: { marginTop: theme.spacing.md },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: theme.spacing.sm },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: theme.spacing.sm },
  name: { ...theme.typography.body, fontWeight: '600', flex: 1 },
  pctWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pct: { ...theme.typography.bodySmall, fontWeight: '700' },
  amount: { ...theme.typography.caption, marginTop: 5 },
});

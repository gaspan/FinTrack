import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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
        actionLabel="Lihat Semua"
        onAction={() => router.push('/(tabs)/budget' as any)}
      />
      <Card>
        {top.map((b, i) => {
          const effectiveLimit = b.monthly_limit + (b.rollover_amount || 0);
          const pct = effectiveLimit > 0 ? (b.spent / effectiveLimit) * 100 : 0;
          const color = statusColor(pct);
          return (
            <View key={b.id} style={i > 0 ? styles.rowSpaced : undefined}>
              <View style={styles.labelRow}>
                <Text style={styles.name} numberOfLines={1}>{b.category_name}</Text>
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
            </View>
          );
        })}
      </Card>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  rowSpaced: { marginTop: theme.spacing.md },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: { ...theme.typography.body, fontWeight: '500', flex: 1, marginRight: theme.spacing.sm },
  pctWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pct: { ...theme.typography.bodySmall, fontWeight: '700' },
  amount: { ...theme.typography.caption, marginTop: 5 },
});

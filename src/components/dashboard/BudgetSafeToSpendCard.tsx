import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatRupiah } from '@/utils/format';
import type { SafeToSpendData } from '@/types';

interface BudgetSafeToSpendCardProps {
  budgetTotals: { limit: number; spent: number; pct: number };
  safeToSpend: SafeToSpendData | null;
}

export const BudgetSafeToSpendCard: React.FC<BudgetSafeToSpendCardProps> = ({
  budgetTotals,
  safeToSpend,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const hasBudget = budgetTotals.limit > 0;
  if (!hasBudget && !safeToSpend) return null;

  const pct = budgetTotals.pct;
  const barColor =
    pct >= 100 ? theme.colors.danger
    : pct >= 90 ? theme.colors.expense
    : pct >= 70 ? theme.colors.warning
    : theme.colors.primary;

  const remaining = budgetTotals.limit - budgetTotals.spent;

  return (
    <View>
      <SectionHeader
        title="Anggaran & Batas Harian"
        icon="speedometer-outline"
        actionLabel="Atur"
        onAction={() => router.push('/(tabs)/budget' as any)}
      />
      <Card style={styles.card}>
        {hasBudget && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/budget' as any)}
          >
            <View style={styles.headRow}>
              <Text style={styles.label}>Terpakai bulan ini</Text>
              <Text style={[styles.pct, { color: barColor }]}>{pct.toFixed(0)}%</Text>
            </View>
            <Text style={styles.amountLine}>
              <Text style={[styles.amountStrong, { color: barColor }]}>{formatRupiah(budgetTotals.spent)}</Text>
              <Text style={styles.amountMuted}> dari {formatRupiah(budgetTotals.limit)}</Text>
            </Text>
            <ProgressBar progress={pct} color={barColor} height={9} style={styles.bar} />
            <Text style={styles.remaining}>
              {remaining >= 0
                ? `Sisa ${formatRupiah(remaining)}`
                : `Lebih ${formatRupiah(Math.abs(remaining))} dari anggaran`}
            </Text>
          </TouchableOpacity>
        )}

        {hasBudget && safeToSpend && <View style={styles.divider} />}

        {safeToSpend && (
          <TouchableOpacity
            style={styles.safeRow}
            activeOpacity={0.8}
            onPress={() => router.push('/forecast' as any)}
          >
            <View style={[styles.safeIcon, { backgroundColor: `${safeToSpend.color}1F` }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={safeToSpend.color} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Aman dipakai hari ini</Text>
              <Text style={styles.safeMeta}>
                {safeToSpend.daysRemaining} hari tersisa · tagihan {formatRupiah(safeToSpend.upcomingBills)}
              </Text>
            </View>
            <View style={styles.safeAmountWrap}>
              <Text style={[styles.safeAmount, { color: safeToSpend.color }]}>
                {formatRupiah(Math.max(0, Math.round(safeToSpend.safeToSpendDaily)))}
              </Text>
              <Text style={styles.perDay}>/hari</Text>
            </View>
          </TouchableOpacity>
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
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textSecondary },
  pct: { ...theme.typography.bodySmall, fontWeight: '800' },
  amountLine: { marginTop: 4, marginBottom: theme.spacing.sm },
  amountStrong: { ...theme.typography.h3, fontSize: 19, fontWeight: '800' },
  amountMuted: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  bar: { marginBottom: 6 },
  remaining: { ...theme.typography.caption },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  safeRow: { flexDirection: 'row', alignItems: 'center' },
  safeIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  safeMeta: { ...theme.typography.caption, marginTop: 1 },
  safeAmountWrap: { flexDirection: 'row', alignItems: 'baseline', marginLeft: theme.spacing.sm },
  safeAmount: { ...theme.typography.h3, fontSize: 18, fontWeight: '800' },
  perDay: { ...theme.typography.caption, marginLeft: 2 },
});

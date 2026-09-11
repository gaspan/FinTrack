import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { BudgetSafeToSpendCard } from '@/components/dashboard/BudgetSafeToSpendCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import { formatRupiah } from '@/utils/format';
import { shouldReduceMotion } from '@/utils/motion';
import type { DashboardData } from '@/features/dashboard/useDashboardData';
import type { Wallet } from '@/types';

/** Chip dompet utama yang disisipkan ke hero (Total Saldo + Dompet Utama jadi satu kartu utama). */
export const PrimaryWalletChip: React.FC<{ wallet: Wallet }> = ({ wallet }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const color = wallet.color || '#FFFFFF';

  return (
    <TouchableOpacity
      style={styles.walletChip}
      activeOpacity={0.8}
      onPress={() => router.push('/wallets' as any)}
      accessibilityRole="button"
      accessibilityLabel={`Dompet utama ${wallet.name}`}
    >
      <View style={[styles.walletIcon, { backgroundColor: `${color}33` }]}>
        <Ionicons name={(wallet.icon || 'wallet') as any} size={14} color="#FFFFFF" />
      </View>
      <View style={styles.walletCopy}>
        <Text style={styles.walletLabel}>DOMPET UTAMA · {wallet.name.toUpperCase()}</Text>
        <Text style={styles.walletBalance} numberOfLines={1}>
          {formatRupiah(wallet.balance)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
};

interface OperationalLayerProps {
  data: DashboardData;
}

/** LAYER 1 — Operasional & actionable: filter periode, anggaran harian, transaksi terbaru. */
export const OperationalLayer: React.FC<OperationalLayerProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const cashFlowColor = data.cashFlow >= 0 ? theme.colors.income : theme.colors.expense;

  return (
    <>
      <AnimatedSection index={0}>
        <Card style={styles.periodCard}>
          <View style={styles.periodHeader}>
            <View style={styles.flex}>
              <Text style={styles.periodTitle}>Ringkasan periode</Text>
              <Text style={styles.periodSubtitle}>Pantau arus kas buku aktif</Text>
            </View>
            <View style={[styles.cashFlowBadge, { borderColor: `${cashFlowColor}40` }]}>
              <View style={[styles.cashFlowIcon, { backgroundColor: `${cashFlowColor}1A` }]}>
                <Ionicons
                  name={data.cashFlow >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={cashFlowColor}
                />
              </View>
              <View>
                <Text style={styles.cashFlowLabel}>Arus kas</Text>
                <Text style={[styles.cashFlowText, { color: cashFlowColor }]}>
                  {data.cashFlow >= 0 ? '+' : ''}{formatRupiah(data.cashFlow)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.periodFilter}>
            <DateRangeFilter
              startDate={data.startDate}
              endDate={data.endDate}
              onChange={data.handleDateRangeChange}
              payrollPeriod={data.payrollPeriod ?? undefined}
              style={styles.periodTrigger}
            />
          </View>
          {data.trendData.length > 1 && (
            <View style={styles.trendRow}>
              <Sparkline
                data={data.trendData.map(t => t.income - t.expense)}
                width={104}
                height={34}
                color={
                  data.trendData[data.trendData.length - 1].income - data.trendData[data.trendData.length - 1].expense >= 0
                    ? theme.colors.income
                    : theme.colors.expense
                }
              />
              <View style={styles.flex}>
                <Text style={styles.trendTitle}>Tren bersih 6 bulan</Text>
                <Text style={styles.trendValue}>
                  {(() => {
                    const last = data.trendData[data.trendData.length - 1];
                    const net = Math.round(last.income - last.expense);
                    return `${net >= 0 ? '+' : '-'}${formatRupiah(Math.abs(net))} bln lalu`;
                  })()}
                </Text>
              </View>
              <Ionicons name="stats-chart-outline" size={16} color={theme.colors.textMuted} />
            </View>
          )}
        </Card>
      </AnimatedSection>

      {data.isPeriodEmpty && (
        <AnimatedSection index={1}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/add' as any)}
            accessibilityRole="button"
            accessibilityLabel="Catat transaksi pertama"
            style={{ borderRadius: 24 }}
          >
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, !shouldReduceMotion() && styles.emptyIconFloat]}>
                <Ionicons name="sparkles-outline" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
                <Text style={styles.emptyText}>Mulai catat pemasukan atau pengeluaran di periode ini.</Text>
              </View>
              <View style={styles.emptyArrow}>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
              </View>
            </Card>
          </TouchableOpacity>
        </AnimatedSection>
      )}

      <AnimatedSection index={2}>
        <BudgetSafeToSpendCard
          budgetTotals={data.budgetTotals}
          safeToSpend={data.safeToSpendData}
        />
      </AnimatedSection>

      <AnimatedSection index={3}>
        <RecentTransactionsCard transactions={data.recentTransactions} />
      </AnimatedSection>
    </>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  flex: { flex: 1 },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  walletIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCopy: { flex: 1 },
  walletLabel: { ...theme.typography.caption, fontSize: 9, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8 },
  walletBalance: { ...theme.typography.body, fontWeight: '800', color: '#FFFFFF', marginTop: 1 },
  periodCard: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  periodTitle: { ...theme.typography.subtitle, color: theme.colors.textPrimary, fontWeight: '700' },
  periodSubtitle: { ...theme.typography.caption, marginTop: 2 },
  periodFilter: { alignItems: 'stretch' },
  periodTrigger: { width: '100%', justifyContent: 'space-between' },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trendTitle: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textPrimary },
  trendValue: { ...theme.typography.caption, marginTop: 2 },
  cashFlowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  cashFlowIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashFlowLabel: { ...theme.typography.caption, fontSize: 9 },
  cashFlowText: { ...theme.typography.bodySmall, fontWeight: '700' },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}12`,
    borderColor: `${theme.colors.primary}30`,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    marginRight: theme.spacing.md,
  },
  emptyIconFloat: {
    animationName: {
      from: { transform: [{ translateY: 0 }] },
      to: { transform: [{ translateY: -6 }] },
    },
    animationDuration: '2.2s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in-out',
  } as any,
  emptyCopy: { flex: 1 },
  emptyTitle: { ...theme.typography.body, fontWeight: '700', color: theme.colors.primary },
  emptyText: { ...theme.typography.caption, color: theme.colors.primary, opacity: 0.8, lineHeight: 18, marginTop: 4 },
  emptyArrow: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}1A`,
    marginLeft: theme.spacing.sm,
  },
});

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { ChartQueries, InsightQueries } from '@/lib/queries';
import { formatRupiah } from '@/utils/format';
import { Card } from '@/components/ui/Card';
import type { CategoryInsight } from '@/types';

dayjs.locale('id');

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatPct(val: number): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(0)}%`;
}

// ────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────

interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
}

export default function ComparisonScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  // Current month = bulan yang sedang ditampilkan (default: bulan ini)
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentMonth = dayjs().subtract(monthOffset, 'month');
  const prevMonth = currentMonth.subtract(1, 'month');

  const currentLabel = currentMonth.format('MMMM YYYY');
  const prevLabel = prevMonth.format('MMMM YYYY');

  const [currentSummary, setCurrentSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpense: 0 });
  const [prevSummary, setPrevSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpense: 0 });
  const [categoryComparisons, setCategoryComparisons] = useState<CategoryInsight[]>([]);

  // ── Load data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const chartQ = new ChartQueries(db, bookId);
      const insightQ = new InsightQueries(db, bookId);

      const curStart = currentMonth.startOf('month').format('YYYY-MM-DD');
      const curEnd = currentMonth.endOf('month').format('YYYY-MM-DD');
      const prvStart = prevMonth.startOf('month').format('YYYY-MM-DD');
      const prvEnd = prevMonth.endOf('month').format('YYYY-MM-DD');

      const [curSum, prvSum, comparisons] = await Promise.all([
        chartQ.getSummary(curStart, curEnd),
        chartQ.getSummary(prvStart, prvEnd),
        insightQ.getCategoryComparison(
          currentMonth.format('YYYY-MM'),
          prevMonth.format('YYYY-MM'),
        ),
      ]);

      setCurrentSummary(curSum);
      setPrevSummary(prvSum);
      setCategoryComparisons(comparisons);
    } catch (e) {
      console.error('Comparison load error:', e);
    } finally {
      setLoading(false);
    }
  }, [db, bookId, monthOffset]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Derived values ────────────────────────────────────────────────
  const incomePct = pctChange(currentSummary.totalIncome, prevSummary.totalIncome);
  const expensePct = pctChange(currentSummary.totalExpense, prevSummary.totalExpense);

  const currentNet = currentSummary.totalIncome - currentSummary.totalExpense;
  const prevNet = prevSummary.totalIncome - prevSummary.totalExpense;
  const netDelta = currentNet - prevNet;

  // Top movers (sorted by absolute delta, take top 3 each direction)
  const topIncreases = [...categoryComparisons]
    .filter(c => c.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  const topDecreases = [...categoryComparisons]
    .filter(c => c.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  // Insight text
  const insightText = useMemo(() => {
    const totalExpCur = currentSummary.totalExpense;
    const totalExpPrv = prevSummary.totalExpense;
    const pct = pctChange(totalExpCur, totalExpPrv);
    const direction = pct > 0 ? 'naik' : pct < 0 ? 'turun' : 'sama';

    let text = `Pengeluaran kamu ${direction} ${Math.abs(pct).toFixed(0)}% dibanding ${prevLabel}`;

    if (topIncreases.length > 0 && pct > 0) {
      text += `, terutama di kategori ${topIncreases[0].category_name} (${formatPct(topIncreases[0].delta_percentage)})`;
    }
    if (topDecreases.length > 0 && pct < 0) {
      text += `, berkat penghematan di ${topDecreases[0].category_name} (${formatPct(topDecreases[0].delta_percentage)})`;
    }
    text += '.';
    return text;
  }, [currentSummary, prevSummary, topIncreases, topDecreases, prevLabel]);

  // Bar chart values
  const maxBarVal = Math.max(
    currentSummary.totalIncome,
    currentSummary.totalExpense,
    prevSummary.totalIncome,
    prevSummary.totalExpense,
    1,
  );

  // Max category val for progress bars
  const maxCatVal = Math.max(...categoryComparisons.map(c => Math.max(c.current_total, c.prev_total)), 1);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Header navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMonthOffset(o => o + 1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{currentLabel}</Text>
          <Text style={styles.headerSubtitle}>vs {prevLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setMonthOffset(o => Math.max(0, o - 1))}
          disabled={monthOffset <= 0}
          hitSlop={12}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={monthOffset <= 0 ? theme.colors.textMuted : theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* ── Summary Cards ──────────────────────────────────── */}
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.monthLabel}>{currentMonth.format('MMM YYYY')}</Text>
              <View style={styles.summaryLine}>
                <Ionicons name="arrow-up-circle" size={14} color={theme.colors.income} />
                <Text style={[styles.summaryVal, { color: theme.colors.income }]}>
                  {formatRupiah(currentSummary.totalIncome)}
                </Text>
              </View>
              <View style={styles.summaryLine}>
                <Ionicons name="arrow-down-circle" size={14} color={theme.colors.expense} />
                <Text style={[styles.summaryVal, { color: theme.colors.expense }]}>
                  {formatRupiah(currentSummary.totalExpense)}
                </Text>
              </View>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.monthLabel}>{prevMonth.format('MMM YYYY')}</Text>
              <View style={styles.summaryLine}>
                <Ionicons name="arrow-up-circle" size={14} color={theme.colors.income} />
                <Text style={[styles.summaryVal, { color: theme.colors.income }]}>
                  {formatRupiah(prevSummary.totalIncome)}
                </Text>
              </View>
              <View style={styles.summaryLine}>
                <Ionicons name="arrow-down-circle" size={14} color={theme.colors.expense} />
                <Text style={[styles.summaryVal, { color: theme.colors.expense }]}>
                  {formatRupiah(prevSummary.totalExpense)}
                </Text>
              </View>
            </Card>
          </View>

          {/* ── Net Change Card ─────────────────────────────────── */}
          <Card style={styles.netCard}>
            <View style={styles.netRow}>
              <View>
                <Text style={styles.netLabel}>Selisih Bersih</Text>
                <Text
                  style={[
                    styles.netValue,
                    { color: netDelta >= 0 ? theme.colors.income : theme.colors.expense },
                  ]}
                >
                  {netDelta >= 0 ? '+' : ''}{formatRupiah(netDelta)}
                </Text>
              </View>
              <View style={styles.pctBadgeRow}>
                <View
                  style={[
                    styles.pctBadge,
                    { backgroundColor: incomePct >= 0 ? `${theme.colors.income}20` : `${theme.colors.expense}20` },
                  ]}
                >
                  <Ionicons
                    name={incomePct >= 0 ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={incomePct >= 0 ? theme.colors.income : theme.colors.expense}
                  />
                  <Text style={[styles.pctText, { color: incomePct >= 0 ? theme.colors.income : theme.colors.expense }]}>
                    Pemasukan {formatPct(incomePct)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pctBadge,
                    { backgroundColor: expensePct <= 0 ? `${theme.colors.income}20` : `${theme.colors.expense}20` },
                  ]}
                >
                  <Ionicons
                    name={expensePct <= 0 ? 'trending-down' : 'trending-up'}
                    size={12}
                    color={expensePct <= 0 ? theme.colors.income : theme.colors.expense}
                  />
                  <Text style={[styles.pctText, { color: expensePct <= 0 ? theme.colors.income : theme.colors.expense }]}>
                    Pengeluaran {formatPct(expensePct)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* ── Grouped Bar Chart ──────────────────────────────── */}
          <Text style={styles.sectionTitle}>Perbandingan Visual</Text>
          <Card style={styles.chartCard}>
            <View style={styles.barChartContainer}>
              {/* Income group */}
              <View style={styles.barGroup}>
                <Text style={styles.barGroupLabel}>Pemasukan</Text>
                <View style={styles.barsRow}>
                  <View style={styles.barWithLabel}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((prevSummary.totalIncome / maxBarVal) * 120, 3),
                          backgroundColor: theme.colors.income,
                          opacity: 0.45,
                        },
                      ]}
                    />
                    <Text style={styles.barBottomLabel}>{prevMonth.format('MMM')}</Text>
                  </View>
                  <View style={styles.barWithLabel}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((currentSummary.totalIncome / maxBarVal) * 120, 3),
                          backgroundColor: theme.colors.income,
                        },
                      ]}
                    />
                    <Text style={styles.barBottomLabel}>{currentMonth.format('MMM')}</Text>
                  </View>
                </View>
              </View>

              {/* Expense group */}
              <View style={styles.barGroup}>
                <Text style={styles.barGroupLabel}>Pengeluaran</Text>
                <View style={styles.barsRow}>
                  <View style={styles.barWithLabel}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((prevSummary.totalExpense / maxBarVal) * 120, 3),
                          backgroundColor: theme.colors.expense,
                          opacity: 0.45,
                        },
                      ]}
                    />
                    <Text style={styles.barBottomLabel}>{prevMonth.format('MMM')}</Text>
                  </View>
                  <View style={styles.barWithLabel}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((currentSummary.totalExpense / maxBarVal) * 120, 3),
                          backgroundColor: theme.colors.expense,
                        },
                      ]}
                    />
                    <Text style={styles.barBottomLabel}>{currentMonth.format('MMM')}</Text>
                  </View>
                </View>
              </View>

              {/* Net group */}
              <View style={styles.barGroup}>
                <Text style={styles.barGroupLabel}>Selisih</Text>
                <View style={styles.barsRow}>
                  <View style={styles.barWithLabel}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((Math.abs(prevNet) / maxBarVal) * 120, 3),
                          backgroundColor: prevNet >= 0 ? theme.colors.income : theme.colors.expense,
                          opacity: 0.45,
                        },
                      ]}
                    />
                    <Text style={styles.barBottomLabel}>{prevMonth.format('MMM')}</Text>
                  </View>
                  <View style={styles.barWithLabel}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((Math.abs(currentNet) / maxBarVal) * 120, 3),
                          backgroundColor: currentNet >= 0 ? theme.colors.income : theme.colors.expense,
                        },
                      ]}
                    />
                    <Text style={styles.barBottomLabel}>{currentMonth.format('MMM')}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.textMuted }]} />
                <Text style={styles.legendText}>{prevMonth.format('MMM YYYY')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.legendText}>{currentMonth.format('MMM YYYY')}</Text>
              </View>
            </View>
          </Card>

          {/* ── Insight Text ───────────────────────────────────── */}
          {(currentSummary.totalExpense > 0 || prevSummary.totalExpense > 0) && (
            <Card style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightIcon}>
                  <Ionicons name="bulb" size={18} color={theme.colors.warning} />
                </View>
                <Text style={styles.insightText}>{insightText}</Text>
              </View>
            </Card>
          )}

          {/* ── Category Breakdown ─────────────────────────────── */}
          {categoryComparisons.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Perubahan per Kategori</Text>
              {categoryComparisons.map((cat) => {
                const curWidth = maxCatVal > 0 ? (cat.current_total / maxCatVal) * 100 : 0;
                const prvWidth = maxCatVal > 0 ? (cat.prev_total / maxCatVal) * 100 : 0;
                const deltaColor =
                  cat.trend === 'up' ? theme.colors.expense :
                  cat.trend === 'down' ? theme.colors.income :
                  theme.colors.textMuted;

                return (
                  <Card key={cat.category_id} style={styles.categoryCard}>
                    <View style={styles.catHeader}>
                      <View style={styles.catLeft}>
                        <View style={[styles.catIconBadge, { backgroundColor: `${cat.category_color}20` }]}>
                          <Ionicons
                            name={(cat.category_icon as keyof typeof Ionicons.glyphMap) || 'ellipse'}
                            size={16}
                            color={cat.category_color}
                          />
                        </View>
                        <Text style={styles.catName} numberOfLines={1}>{cat.category_name}</Text>
                      </View>
                      <View style={[styles.deltaBadge, { backgroundColor: `${deltaColor}15` }]}>
                        <Ionicons
                          name={cat.trend === 'up' ? 'arrow-up' : cat.trend === 'down' ? 'arrow-down' : 'remove'}
                          size={12}
                          color={deltaColor}
                        />
                        <Text style={[styles.deltaText, { color: deltaColor }]}>
                          {formatPct(cat.delta_percentage)}
                        </Text>
                      </View>
                    </View>

                    {/* Amounts row */}
                    <View style={styles.catAmountsRow}>
                      <Text style={styles.catAmount}>
                        {currentMonth.format('MMM')}: {formatRupiah(cat.current_total)}
                      </Text>
                      <Text style={[styles.catAmount, { color: theme.colors.textMuted }]}>
                        {prevMonth.format('MMM')}: {formatRupiah(cat.prev_total)}
                      </Text>
                    </View>

                    {/* Progress bars */}
                    <View style={styles.catBarsWrap}>
                      <View style={styles.catBarTrack}>
                        <View
                          style={[
                            styles.catBarFill,
                            {
                              width: `${Math.max(curWidth, 1)}%`,
                              backgroundColor: cat.category_color,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.catBarTrack}>
                        <View
                          style={[
                            styles.catBarFill,
                            {
                              width: `${Math.max(prvWidth, 1)}%`,
                              backgroundColor: cat.category_color,
                              opacity: 0.35,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          {/* ── Top Movers ─────────────────────────────────────── */}
          {(topIncreases.length > 0 || topDecreases.length > 0) && (
            <>
              <Text style={styles.sectionTitle}>Top Movers</Text>
              <View style={styles.moversRow}>
                {/* Most increased */}
                {topIncreases.length > 0 && (
                  <Card style={[styles.moverCard, { borderLeftColor: theme.colors.expense, borderLeftWidth: 3 }]}>
                    <Text style={styles.moverCardTitle}>Paling Naik ↑</Text>
                    {topIncreases.map((cat) => (
                      <View key={cat.category_id} style={styles.moverItem}>
                        <Ionicons
                          name={(cat.category_icon as keyof typeof Ionicons.glyphMap) || 'ellipse'}
                          size={14}
                          color={cat.category_color}
                        />
                        <Text style={styles.moverName} numberOfLines={1}>{cat.category_name}</Text>
                        <Text style={[styles.moverDelta, { color: theme.colors.expense }]}>
                          {formatPct(cat.delta_percentage)}
                        </Text>
                      </View>
                    ))}
                  </Card>
                )}

                {/* Most decreased */}
                {topDecreases.length > 0 && (
                  <Card style={[styles.moverCard, { borderLeftColor: theme.colors.income, borderLeftWidth: 3 }]}>
                    <Text style={styles.moverCardTitle}>Paling Turun ↓</Text>
                    {topDecreases.map((cat) => (
                      <View key={cat.category_id} style={styles.moverItem}>
                        <Ionicons
                          name={(cat.category_icon as keyof typeof Ionicons.glyphMap) || 'ellipse'}
                          size={14}
                          color={cat.category_color}
                        />
                        <Text style={styles.moverName} numberOfLines={1}>{cat.category_name}</Text>
                        <Text style={[styles.moverDelta, { color: theme.colors.income }]}>
                          {formatPct(cat.delta_percentage)}
                        </Text>
                      </View>
                    ))}
                  </Card>
                )}
              </View>
            </>
          )}

          <View style={{ height: 60 }} />
        </>
      )}
    </ScrollView>
  );
}

// ────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: theme.spacing.lg, paddingBottom: 100 },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    headerCenter: { alignItems: 'center' },
    headerTitle: { ...theme.typography.h2 },
    headerSubtitle: { ...theme.typography.bodySmall, marginTop: 2 },

    // Summary
    summaryRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    summaryCard: { flex: 1, padding: theme.spacing.md },
    monthLabel: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      color: theme.colors.textSecondary,
    },
    summaryLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    summaryVal: {
      ...theme.typography.body,
      fontWeight: '700',
      fontSize: 13,
    },

    // Net card
    netCard: { padding: theme.spacing.md, marginBottom: theme.spacing.lg },
    netRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    netLabel: { ...theme.typography.bodySmall, marginBottom: 2 },
    netValue: { ...theme.typography.h3, fontWeight: 'bold' },
    pctBadgeRow: { alignItems: 'flex-end', gap: 6 },
    pctBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.round,
    },
    pctText: { fontSize: 11, fontWeight: '600' },

    // Section
    sectionTitle: {
      ...theme.typography.h3,
      fontSize: 17,
      marginBottom: theme.spacing.sm,
    },

    // Chart card
    chartCard: { padding: theme.spacing.md, marginBottom: theme.spacing.lg },
    barChartContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      height: 160,
      paddingTop: 20,
    },
    barGroup: { alignItems: 'center', flex: 1 },
    barGroupLabel: {
      ...theme.typography.caption,
      marginBottom: 8,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    barsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    barWithLabel: { alignItems: 'center' },
    bar: { width: 22, borderRadius: 6, minHeight: 3 },
    barBottomLabel: { ...theme.typography.caption, fontSize: 9, marginTop: 4 },

    // Legend
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.xl,
      marginTop: theme.spacing.md,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { ...theme.typography.bodySmall },

    // Insight
    insightCard: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.warning,
    },
    insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    insightIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${theme.colors.warning}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    insightText: {
      ...theme.typography.body,
      flex: 1,
      lineHeight: 20,
    },

    // Category card
    categoryCard: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    catHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    catIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catName: {
      ...theme.typography.body,
      fontWeight: '600',
      flex: 1,
    },
    deltaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.round,
    },
    deltaText: { fontSize: 12, fontWeight: '700' },
    catAmountsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    catAmount: {
      ...theme.typography.bodySmall,
      fontWeight: '500',
    },
    catBarsWrap: { gap: 4 },
    catBarTrack: {
      height: 6,
      backgroundColor: theme.colors.track,
      borderRadius: 3,
      overflow: 'hidden',
    },
    catBarFill: {
      height: 6,
      borderRadius: 3,
    },

    // Top movers
    moversRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    moverCard: {
      flex: 1,
      padding: theme.spacing.md,
    },
    moverCardTitle: {
      ...theme.typography.bodySmall,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    moverItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 5,
    },
    moverName: {
      ...theme.typography.bodySmall,
      flex: 1,
      fontWeight: '500',
    },
    moverDelta: {
      fontSize: 12,
      fontWeight: '700',
    },
  });

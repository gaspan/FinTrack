import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { ChartQueries, TransactionQueries } from '@/lib/queries';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { formatRupiahShort } from '@/utils/format';
import { generateAndSharePDF } from '@/features/export/pdfGenerator';
import { useDashboardData } from '@/features/dashboard/useDashboardData';
import { OperationalLayer, PrimaryWalletChip } from '@/components/dashboard/layers/OperationalLayer';
import { AlertsLayer } from '@/components/dashboard/layers/AlertsLayer';
import { AnalyticsLayer } from '@/components/dashboard/layers/AnalyticsLayer';
import { WealthLayer } from '@/components/dashboard/layers/WealthLayer';
import { MarketLayer } from '@/components/dashboard/layers/MarketLayer';

dayjs.locale('id');

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Ringkasan (Dashboard) — layar tipis yang hanya merakit 5 layer:
 * 1. Operasional  2. Wawasan & tagihan  3. Analitik  4. Kekayaan  5. Makro/pasar.
 */
export default function DashboardScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;
  const data = useDashboardData();

  const [exporting, setExporting] = useState(false);
  const insets = useSafeAreaInsets();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.28 }],
    opacity: interpolate(scrollY.value, [0, 320], [1, 0.55], Extrapolation.CLAMP),
  }));
  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [150, 230], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [150, 230], [-10, 0], Extrapolation.CLAMP) },
    ],
  }));

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting(true);
      const [currentSummary, breakdown, allTx] = await Promise.all([
        new ChartQueries(db, bookId).getSummary(data.startDate, data.endDate),
        new ChartQueries(db, bookId).getCategoryBreakdown(data.startDate, data.endDate, data.chartType),
        new TransactionQueries(db, bookId).getByDateRange(data.startDate, data.endDate),
      ]);
      const period = data.startDate === dayjs(data.startDate).startOf('month').format('YYYY-MM-DD') &&
                      data.endDate === dayjs(data.endDate).endOf('month').format('YYYY-MM-DD')
        ? dayjs(data.startDate).format('MMMM YYYY')
        : `${dayjs(data.startDate).format('DD MMM')} - ${dayjs(data.endDate).format('DD MMM YYYY')}`;
      await generateAndSharePDF(allTx, { ...currentSummary, categoryBreakdown: breakdown }, period);
    } catch (e) {
      console.error('Export PDF error:', e);
      Alert.alert('Gagal', `Tidak dapat mengekspor PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  }, [db, bookId, data.startDate, data.endDate, data.chartType]);

  if (data.initialLoad) return <DashboardSkeleton />;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={data.onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View style={heroParallaxStyle}>
          <DashboardHero
            greeting={getGreeting()}
            dateText={dayjs().format('dddd, DD MMMM YYYY')}
            totalBalance={data.totalBalance}
            income={data.summary.totalIncome}
            expense={data.summary.totalExpense}
            trend={data.trend}
            trendLabel={data.trendLabel}
            payrollLabel={data.payrollPeriod?.label}
            exporting={exporting}
            onExport={handleExportPDF}
          >
            {data.primaryWallet && <PrimaryWalletChip wallet={data.primaryWallet} />}
          </DashboardHero>
        </Animated.View>

        <View style={styles.contentColumn}>
          <View style={styles.body}>
            <OperationalLayer data={data} />
            <AlertsLayer data={data} />
            <AnalyticsLayer data={data} />
            <WealthLayer data={data} />
            <MarketLayer />
          </View>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[styles.stickyHeader, { paddingTop: insets.top + 10 }, stickyHeaderStyle]}
      >
        <View style={styles.stickyPill}>
          <View style={styles.stickyDot} />
          <Text style={styles.stickyBalance} numberOfLines={1}>
            {formatRupiahShort(data.totalBalance)}
          </Text>
          <Text style={[styles.stickyTrend, { color: data.trend.isUp ? theme.colors.income : theme.colors.expense }]}>
            {data.trend.isUp ? '▲' : '▼'} {data.trend.pct}%
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 130 },
  contentColumn: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  body: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingBottom: 20,
  },
  stickyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.md,
  },
  stickyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  stickyBalance: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stickyTrend: { ...theme.typography.caption, fontWeight: '700' },
});

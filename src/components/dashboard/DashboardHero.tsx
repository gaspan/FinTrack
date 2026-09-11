import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { formatRupiah } from '@/utils/format';
import { shouldReduceMotion } from '@/utils/motion';
import { useCountUp } from '@/utils/countUp';

interface DashboardHeroProps {
  greeting: string;
  dateText: string;
  totalBalance: number;
  income: number;
  expense: number;
  trend: { diff: number; isUp: boolean; pct: string };
  trendLabel: string;
  payrollLabel?: string;
  exporting: boolean;
  onExport: () => void;
  children?: React.ReactNode;
}

const enter = (delay: number) =>
  shouldReduceMotion() ? undefined : FadeInDown.duration(420).delay(delay).springify().damping(22).stiffness(170);

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  greeting,
  dateText,
  totalBalance,
  income,
  expense,
  trend,
  trendLabel,
  payrollLabel,
  exporting,
  onExport,
  children,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { activeBook } = useBook();
  const bookColor = activeBook?.color || theme.colors.primary;
  const balanceShown = useCountUp(totalBalance);
  const incomeShown = useCountUp(income);
  const expenseShown = useCountUp(expense);
  const reduceMotion = shouldReduceMotion();
  const floatA = reduceMotion
    ? undefined
    : {
        animationName: {
          from: { transform: [{ translateY: 0 }] },
          to: { transform: [{ translateY: 16 }] },
        },
        animationDuration: '3.4s',
        animationIterationCount: 'infinite' as const,
        animationDirection: 'alternate' as const,
        animationTimingFunction: 'ease-in-out' as const,
      };
  const floatB = reduceMotion
    ? undefined
    : {
        animationName: {
          from: { transform: [{ translateY: 10 }] },
          to: { transform: [{ translateY: -10 }] },
        },
        animationDuration: '4.2s',
        animationIterationCount: 'infinite' as const,
        animationDirection: 'alternate' as const,
        animationTimingFunction: 'ease-in-out' as const,
      };

  return (
    <LinearGradient
      colors={theme.colors.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + theme.spacing.md }]}
    >
      <View style={styles.decoWrap} pointerEvents="none">
        <Animated.View style={[styles.decoCircleA, floatA]} />
        <Animated.View style={[styles.decoCircleB, floatB]} />
        <View style={styles.decoRing} />
      </View>

      <Animated.View entering={enter(0)} style={styles.topRow}>
        <View style={styles.flex}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{dateText}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onExport}
          disabled={exporting}
          activeOpacity={0.7}
          accessibilityLabel="Ekspor PDF"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
          ) : (
            <Ionicons name="download-outline" size={18} color={theme.colors.textOnPrimary} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {activeBook && (
        <Animated.View entering={enter(60)}>
          <TouchableOpacity
            style={styles.bookSelector}
            activeOpacity={0.75}
            onPress={() => router.push('/books' as any)}
            accessibilityRole="button"
            accessibilityLabel={`Pembukuan aktif ${activeBook.name}`}
          >
            <View style={[styles.bookIcon, { backgroundColor: `${bookColor}2E` }]}>
              <Ionicons name={(activeBook.icon || 'book-outline') as any} size={18} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.bookEyebrow}>PEMBUKUAN AKTIF</Text>
              <Text style={styles.bookName} numberOfLines={1}>{activeBook.name}</Text>
            </View>
            <View style={styles.bookArrow}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textOnPrimary} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Animated.View entering={enter(120)}>
        <Text style={styles.balanceLabel}>Saldo seluruh dompet</Text>
        <Text
          style={styles.balanceValue}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatRupiah(Math.round(balanceShown))}
        </Text>
      </Animated.View>

      <Animated.View entering={enter(180)} style={styles.chipRow}>
        <View style={styles.chip}>
          <View style={[styles.statusDot, { backgroundColor: trend.isUp ? '#FFFFFF' : '#FFE08A' }]} />
          <Ionicons
            name={trend.isUp ? 'trending-up' : 'trending-down'}
            size={12}
            color={theme.colors.textOnPrimary}
          />
          <Text style={styles.chipText}>
            {trend.isUp ? '+' : '-'}{trend.pct}% {trendLabel}
          </Text>
        </View>
        {payrollLabel != null && (
          <View style={styles.chip}>
            <Ionicons name="cash-outline" size={12} color={theme.colors.textOnPrimary} />
            <Text style={styles.chipText}>{payrollLabel}</Text>
          </View>
        )}
      </Animated.View>

      {children}

      <Animated.View entering={enter(240)} style={styles.splitRow}>
        <View style={styles.splitCell}>
          <View style={styles.splitLabelRow}>
            <View style={styles.inBadge}>
              <Ionicons name="arrow-down" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.splitLabel}>Pemasukan</Text>
          </View>
          <Text
            style={styles.splitValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupiah(Math.round(incomeShown))}
          </Text>
        </View>
        <View style={styles.splitDivider} />
        <View style={styles.splitCell}>
          <View style={styles.splitLabelRow}>
            <View style={styles.outBadge}>
              <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.splitLabel}>Pengeluaran</Text>
          </View>
          <Text
            style={styles.splitValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupiah(Math.round(expenseShown))}
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  decoWrap: {
    ...StyleSheet.absoluteFill,
  },
  decoCircleA: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -120,
    right: -100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoCircleB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 60,
    left: -80,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decoRing: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    bottom: -250,
    right: 20,
    borderWidth: 40,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  flex: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  greeting: {
    ...theme.typography.h3,
    color: theme.colors.textOnPrimary,
    fontSize: 21,
  },
  date: {
    ...theme.typography.bodySmall,
    color: theme.colors.textOnPrimary,
    opacity: 0.82,
    marginTop: 2,
  },
  bookSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: theme.spacing.md,
  },
  bookIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  bookEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.textOnPrimary,
    opacity: 0.72,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  bookName: {
    ...theme.typography.body,
    color: theme.colors.textOnPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  bookArrow: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginLeft: theme.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  balanceLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textOnPrimary,
    opacity: 0.85,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 10,
    fontWeight: '600',
  },
  balanceValue: {
    ...theme.typography.amount,
    color: theme.colors.textOnPrimary,
    marginTop: 8,
    fontSize: 52,
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.round,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 11,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  splitCell: { flex: 1, paddingHorizontal: theme.spacing.xs },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: theme.spacing.xs,
  },
  splitLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  outBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  splitLabel: {
    ...theme.typography.caption,
    color: theme.colors.textOnPrimary,
    opacity: 0.92,
    fontWeight: '500',
  },
  splitValue: {
    ...theme.typography.subtitle,
    fontFamily: theme.typography.h3.fontFamily,
    fontWeight: '700',
    color: theme.colors.textOnPrimary,
    marginTop: 6,
    fontSize: 15,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { formatRupiah } from '@/utils/format';

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

  return (
    <LinearGradient
      colors={theme.colors.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + theme.spacing.md }]}
    >
      <View style={styles.topRow}>
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
      </View>

      {activeBook && (
        <TouchableOpacity
          style={styles.bookSelector}
          activeOpacity={0.75}
          onPress={() => router.push('/books' as any)}
          accessibilityRole="button"
          accessibilityLabel={`Pembukuan aktif ${activeBook.name}`}
        >
          <View style={[styles.bookIcon, { backgroundColor: `${bookColor}26` }]}>
            <Ionicons name={(activeBook.icon || 'book-outline') as any} size={18} color={bookColor} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.bookEyebrow}>PEMBUKUAN AKTIF</Text>
            <Text style={styles.bookName} numberOfLines={1}>{activeBook.name}</Text>
          </View>
          <View style={styles.bookArrow}>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textOnPrimary} />
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.balanceLabel}>Saldo seluruh dompet</Text>
      <Animated.Text
        key={totalBalance}
        entering={FadeIn.duration(300)}
        style={styles.balanceValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatRupiah(totalBalance)}
      </Animated.Text>

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <View style={[styles.statusDot, { backgroundColor: trend.isUp ? theme.colors.income : theme.colors.expense }]} />
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
      </View>

      {children}

      <View style={styles.splitRow}>
        <View style={styles.splitCell}>
          <View style={styles.splitLabelRow}>
            <Ionicons name="arrow-down-circle" size={13} color={theme.colors.income} />
            <Text style={styles.splitLabel}>Pemasukan</Text>
          </View>
          <Animated.Text
            key={income}
            entering={FadeIn.duration(300)}
            style={styles.splitValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupiah(income)}
          </Animated.Text>
        </View>
        <View style={styles.splitDivider} />
        <View style={styles.splitCell}>
          <View style={styles.splitLabelRow}>
            <Ionicons name="arrow-up-circle" size={13} color={theme.colors.expense} />
            <Text style={styles.splitLabel}>Pengeluaran</Text>
          </View>
          <Animated.Text
            key={expense}
            entering={FadeIn.duration(300)}
            style={styles.splitValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupiah(expense)}
          </Animated.Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  hero: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  flex: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.h3,
    color: theme.colors.textOnPrimary,
  },
  date: {
    ...theme.typography.bodySmall,
    color: theme.colors.textOnPrimary,
    opacity: 0.8,
    marginTop: 2,
  },
  bookSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginBottom: theme.spacing.lg,
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
    opacity: 0.7,
    fontSize: 9,
    letterSpacing: 0.7,
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
    backgroundColor: theme.colors.glass,
    marginLeft: theme.spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  balanceLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textOnPrimary,
    opacity: 0.85,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 10,
  },
  balanceValue: {
    ...theme.typography.amount,
    color: theme.colors.textOnPrimary,
    marginTop: 4,
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
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
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
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  splitCell: { flex: 1, paddingHorizontal: theme.spacing.xs },
  splitDivider: {
    width: 1,
    backgroundColor: theme.colors.glassBorder,
    marginHorizontal: theme.spacing.xs,
  },
  splitLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  splitLabel: {
    ...theme.typography.caption,
    color: theme.colors.textOnPrimary,
    opacity: 0.9,
  },
  splitValue: {
    ...theme.typography.subtitle,
    fontFamily: theme.typography.h3.fontFamily,
    fontWeight: '700',
    color: theme.colors.textOnPrimary,
    marginTop: 2,
  },
});

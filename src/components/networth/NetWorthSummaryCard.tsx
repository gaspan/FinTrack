import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';
import { useCountUp } from '@/utils/countUp';

interface NetWorthSummaryCardProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  history?: number[];
}

export const NetWorthSummaryCard: React.FC<NetWorthSummaryCardProps> = ({
  totalAssets,
  totalLiabilities,
  netWorth,
  history = [],
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isPositive = netWorth >= 0;
  const accent = isPositive ? theme.colors.success : theme.colors.danger;
  const netWorthShown = useCountUp(Math.round(netWorth));

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/net-worth' as any)}>
      <Card style={[styles.card, { borderLeftColor: accent }]}>
        <LinearGradient
          colors={[`${accent}16`, `${accent}04`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${theme.colors.primary}1F` }]}>
            <Ionicons name="diamond-outline" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Kekayaan Bersih</Text>
          <View style={[styles.trendPill, { backgroundColor: `${accent}1A` }]}>
            <View style={[styles.trendDot, { backgroundColor: accent }]} />
            <Text style={[styles.trendText, { color: accent }]}>
              {isPositive ? 'Surplus' : 'Defisit'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.flex}>
            <Text style={[styles.amount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
              {isPositive ? '' : '-'}Rp {Math.abs(Math.round(netWorthShown)).toLocaleString('id-ID')}
            </Text>
          </View>
          {history.length > 1 && (
            <View style={styles.sparkWrap}>
              <Sparkline data={history} width={104} height={42} color={accent} />
            </View>
          )}
        </View>

        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.miniDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.breakdownLabel}>Aset</Text>
            </View>
            <Text style={styles.breakdownValue}>+Rp {totalAssets.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.miniDot, { backgroundColor: theme.colors.danger }]} />
              <Text style={styles.breakdownLabel}>Utang</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: theme.colors.danger }]}>
              -Rp {totalLiabilities.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderLeftWidth: 4,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...theme.typography.subtitle, flex: 1, fontWeight: '700' },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.round,
  },
  trendDot: { width: 6, height: 6, borderRadius: 3 },
  trendText: { ...theme.typography.caption, fontWeight: '700', fontSize: 10 },
  flex: { flex: 1 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 12 },
  amount: { ...theme.typography.h2, fontSize: 23, color: theme.colors.textPrimary },
  sparkWrap: {
    padding: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  breakdown: {
    gap: 8,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  breakdownLabel: { ...theme.typography.bodySmall },
  breakdownValue: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.success },
});

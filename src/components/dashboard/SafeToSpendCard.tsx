import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SafeToSpendData } from '@/types';
import { formatRupiah } from '@/utils/format';
import { useCountUp } from '@/utils/countUp';

interface SafeToSpendCardProps {
  data: SafeToSpendData;
}

export const SafeToSpendCard: React.FC<SafeToSpendCardProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const statusLabel =
    data.status === 'healthy' ? 'Aman' : data.status === 'caution' ? 'Hati-hati' : 'Terbatas';
  const accent =
    data.status === 'healthy'
      ? theme.colors.success
      : data.status === 'caution'
        ? theme.colors.warning
        : theme.colors.danger;

  const spentRatio =
    data.totalBalance > 0
      ? Math.min(100, ((data.upcomingBills + data.savingsTarget) / data.totalBalance) * 100)
      : 0;
  const dailyShown = useCountUp(Math.round(data.safeToSpendDaily));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push('/forecast' as any)}
      accessibilityRole="button"
      accessibilityLabel="Lihat sisa aman hari ini"
      style={{ borderRadius: theme.radius.xl }}
    >
      <Card style={[styles.card, { borderLeftColor: accent }]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.xl, overflow: 'hidden' }]}>
          <LinearGradient
            colors={[`${accent}1A`, `${accent}05`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.header}>
          <View style={[styles.shieldBadge, { backgroundColor: `${accent}1F` }]}>
            <Ionicons name="shield-checkmark" size={15} color={accent} />
          </View>
          <Text style={styles.title}>Sisa Aman Hari Ini</Text>
          <View style={[styles.pill, { backgroundColor: `${accent}22` }]}>
            <View style={[styles.pillDot, { backgroundColor: accent }]} />
            <Text style={[styles.status, { color: accent }]}>{statusLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={theme.colors.textMuted} />
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatRupiah(Math.round(dailyShown))}
          </Text>
          <Text style={styles.perDay}>/hari</Text>
        </View>

        <ProgressBar progress={spentRatio} color={accent} height={6} style={styles.bar} />
        <View style={styles.footerRow}>
          <Text style={styles.sub}>Sisa {data.daysRemaining} hari</Text>
          <Text style={styles.sub}>
            Tagihan {formatRupiah(data.upcomingBills)} · Tabungan {formatRupiah(data.savingsTarget)}
          </Text>
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
    ...theme.shadow.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  shieldBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...theme.typography.subtitle, flex: 1, color: theme.colors.textPrimary, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radius.round,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  status: { ...theme.typography.caption, fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  amount: { ...theme.typography.h2, fontSize: 26 },
  perDay: { ...theme.typography.bodySmall },
  bar: { marginTop: theme.spacing.sm },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: theme.spacing.sm,
  },
  sub: { ...theme.typography.caption, flexShrink: 1 },
});

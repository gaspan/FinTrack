import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SafeToSpendData } from '@/types';
import { formatRupiah } from '@/utils/format';

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

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/forecast' as any)}>
      <Card style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={16} color={accent} />
          <Text style={styles.title}>Sisa Aman Hari Ini</Text>
          <View style={[styles.pill, { backgroundColor: `${accent}22` }]}>
            <Text style={[styles.status, { color: accent }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatRupiah(Math.round(data.safeToSpendDaily))}
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
  card: { padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  title: { ...theme.typography.subtitle, flex: 1, color: theme.colors.textPrimary },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.round },
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

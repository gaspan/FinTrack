import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';

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

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/net-worth' as any)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.title}>Kekayaan Bersih</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.flex}>
            <Text style={[styles.amount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
              {isPositive ? '' : '-'}Rp {Math.abs(netWorth).toLocaleString('id-ID')}
            </Text>
          </View>
          {history.length > 1 && (
            <Sparkline data={history} width={96} height={38} color={accent} />
          )}
        </View>

        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Aset</Text>
            <Text style={styles.breakdownValue}>+Rp {totalAssets.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Utang</Text>
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
  card: { padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { ...theme.typography.subtitle, flex: 1 },
  flex: { flex: 1 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 10 },
  amount: { ...theme.typography.h2, fontSize: 22, color: theme.colors.textPrimary },
  breakdown: { gap: 4 },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...theme.typography.bodySmall },
  breakdownValue: { ...theme.typography.bodySmall, fontWeight: '600', color: theme.colors.success },
});

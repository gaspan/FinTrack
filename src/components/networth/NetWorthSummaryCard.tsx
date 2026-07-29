import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

interface NetWorthSummaryCardProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export const NetWorthSummaryCard: React.FC<NetWorthSummaryCardProps> = ({ totalAssets, totalLiabilities, netWorth }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const isPositive = netWorth >= 0;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/net-worth' as any)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.title}>Kekayaan Bersih</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </View>
        <Text style={[styles.amount, { color: isPositive ? '#10B981' : '#EF4444' }]}>
          {isPositive ? '' : '-'}Rp {Math.abs(netWorth).toLocaleString('id-ID')}
        </Text>
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Aset</Text>
            <Text style={styles.breakdownValue}>+Rp {totalAssets.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Utang</Text>
            <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>-Rp {totalLiabilities.toLocaleString('id-ID')}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: { marginBottom: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { ...theme.typography.subtitle, flex: 1 },
  amount: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  breakdown: { gap: 4 },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 12, color: theme.colors.textSecondary },
  breakdownValue: { fontSize: 12, fontWeight: '600', color: '#10B981' },
});
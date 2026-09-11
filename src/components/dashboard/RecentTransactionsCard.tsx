import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatRupiah } from '@/utils/format';
import { staggerDelay, shouldReduceMotion } from '@/utils/motion';
import type { TransactionWithDetails } from '@/types';

interface RecentTransactionsCardProps {
  transactions: TransactionWithDetails[];
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({ transactions }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reduceMotion = shouldReduceMotion();

  if (transactions.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="Transaksi terbaru"
        icon="receipt-outline"
        actionLabel="Lihat semua"
        onAction={() => router.push('/(tabs)/transactions' as any)}
      />
      <Card style={styles.card}>
        {transactions.map((tx, i) => (
          <Animated.View
            key={tx.id}
            layout={reduceMotion ? undefined : LinearTransition.springify().damping(20)}
            entering={reduceMotion ? undefined : FadeInDown.duration(280).delay(staggerDelay(i, 40))}
          >
            <TouchableOpacity
              style={[styles.item, i > 0 && styles.itemBorder]}
              activeOpacity={0.7}
              onPress={() => router.push(`/transaction/${tx.id}` as any)}
            >
              <View style={[styles.icon, { backgroundColor: tx.category_color + '22' }]}>
                <Ionicons name={tx.category_icon as any} size={18} color={tx.category_color} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.category} numberOfLines={1}>{tx.category_name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{tx.notes || tx.wallet_name}</Text>
              </View>
              <View style={styles.amountWrap}>
                <Text
                  style={[
                    styles.amount,
                    { color: tx.type === 'income' ? theme.colors.income : theme.colors.textPrimary },
                  ]}
                >
                  {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                </Text>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: tx.type === 'income' ? theme.colors.income : theme.colors.expense },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Card>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: { borderRadius: theme.radius.xl, ...theme.shadow.md },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  itemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  icon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  category: { ...theme.typography.body, fontWeight: '600' },
  meta: { ...theme.typography.caption },
  amountWrap: { alignItems: 'flex-end', gap: 4, marginLeft: theme.spacing.sm },
  amount: { ...theme.typography.body, fontWeight: 'bold' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

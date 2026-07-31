import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatRupiahShort } from '@/utils/format';
import type { SavingsGoal } from '@/types';

interface GoalsStripProps {
  goals: SavingsGoal[];
}

export const GoalsStrip: React.FC<GoalsStripProps> = ({ goals }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const active = goals.filter((g) => !g.is_completed).slice(0, 5);
  if (active.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="Target Menabung"
        actionLabel="Lihat Semua"
        onAction={() => router.push('/goals' as any)}
      />
      <Card>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {active.map((g) => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            return (
              <TouchableOpacity
                key={g.id}
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => router.push('/goals' as any)}
              >
                <ProgressRing
                  progress={pct}
                  size={66}
                  color={g.color || theme.colors.primary}
                  label={`${pct.toFixed(0)}%`}
                />
                <Text style={styles.name} numberOfLines={1}>{g.name}</Text>
                <Text style={styles.amount} numberOfLines={1}>
                  {formatRupiahShort(g.current_amount)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Card>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  strip: { gap: theme.spacing.lg, paddingHorizontal: theme.spacing.xs },
  item: { alignItems: 'center', width: 76 },
  name: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginTop: 6,
  },
  amount: { ...theme.typography.caption },
});

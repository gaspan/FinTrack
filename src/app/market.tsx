import React, { useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { GoldPriceCard } from '@/components/dashboard/GoldPriceCard';
import { UsdIdrCard } from '@/components/dashboard/UsdIdrCard';

export default function MarketScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.block}>
        <GoldPriceCard />
      </Card>

      <Card style={styles.block}>
        <UsdIdrCard />
      </Card>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.md },
  block: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
    marginBottom: theme.spacing.lg,
  },
});

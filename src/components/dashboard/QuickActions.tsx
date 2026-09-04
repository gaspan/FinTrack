import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';
import { Card } from '@/components/ui/Card';

interface Action {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: (t: Theme) => string;
  route: string;
}

const ACTIONS: Action[] = [
  { label: 'Tambah', icon: 'add-circle', color: (t) => t.colors.primary, route: '/(tabs)/add' },
  { label: 'Transfer', icon: 'swap-horizontal', color: (t) => t.colors.info, route: '/transfer' },
  { label: 'Anggaran', icon: 'pie-chart', color: (t) => t.colors.warning, route: '/(tabs)/budget' },
  { label: 'Target', icon: 'flag', color: (t) => t.colors.accent, route: '/goals' },
];

const QuickActionItem: React.FC<{
  action: Action;
  color: string;
  itemStyle: object;
  touchStyle: object;
  iconWrapStyle: object;
  labelStyle: object;
}> = ({ action, color, itemStyle, touchStyle, iconWrapStyle, labelStyle }) => {
  const [pressed, setPressed] = useState(false);

  return (
    <Animated.View
      style={[
        itemStyle,
        {
          transform: [{ scale: pressed ? 0.9 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 150,
          transitionTimingFunction: 'ease',
        },
      ]}
    >
      <TouchableOpacity
        style={touchStyle}
        activeOpacity={0.7}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => {
          hapticLight();
          router.push(action.route as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <View style={[iconWrapStyle, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={action.icon} size={21} color={color} />
        </View>
        <Text style={labelStyle}>{action.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QuickActions: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Aksi cepat</Text>
          <Text style={styles.subtitle}>Kelola uangmu dalam satu tap</Text>
        </View>
        <Ionicons name="flash-outline" size={18} color={theme.colors.warning} />
      </View>
      <View style={styles.row}>
        {ACTIONS.map((a) => (
          <QuickActionItem
            key={a.label}
            action={a}
            color={a.color(theme)}
            itemStyle={styles.item}
            touchStyle={styles.touch}
            iconWrapStyle={styles.iconWrap}
            labelStyle={styles.label}
          />
        ))}
      </View>
    </Card>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: { flex: 1 },
  touch: { alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

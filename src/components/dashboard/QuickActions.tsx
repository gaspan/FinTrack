import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';

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

export const QuickActions: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => {
        const color = a.color(theme);
        return (
          <TouchableOpacity
            key={a.label}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => router.push(a.route as any)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${color}1F` }]}>
              <Ionicons name={a.icon} size={22} color={color} />
            </View>
            <Text style={styles.label}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  item: { alignItems: 'center', flex: 1, gap: 6 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
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

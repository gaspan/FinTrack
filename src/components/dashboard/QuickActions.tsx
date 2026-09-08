import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';
import { shouldReduceMotion, staggerDelay } from '@/utils/motion';

interface Action {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  route: string;
}

const ACTIONS: Action[] = [
  { label: 'Tambah', hint: 'Catat', icon: 'add', tint: '#00D09C', bg: 'rgba(0,208,156,0.14)', route: '/(tabs)/add' },
  { label: 'Transfer', hint: 'Pindah', icon: 'swap-horizontal', tint: '#38BDF8', bg: 'rgba(56,189,248,0.14)', route: '/transfer' },
  { label: 'Anggaran', hint: 'Batas', icon: 'pie-chart', tint: '#FBBF24', bg: 'rgba(251,191,36,0.16)', route: '/(tabs)/budget' },
  { label: 'Target', hint: 'Goal', icon: 'flag', tint: '#818CF8', bg: 'rgba(129,140,248,0.16)', route: '/goals' },
];

const QuickActionItem: React.FC<{ action: Action; index: number }> = ({ action, index }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = () => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value (UI thread)
    scale.value = withSpring(0.88, { damping: 14, stiffness: 320 });
  };
  const pressOut = () => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value (UI thread)
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
  };

  return (
    <Animated.View
      style={[styles.item, animStyle]}
      entering={shouldReduceMotion() ? undefined : FadeInDown.duration(360).delay(staggerDelay(index, 55)).springify().damping(20)}
    >
      <TouchableOpacity
        style={styles.touch}
        activeOpacity={0.75}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => {
          hapticLight();
          router.push(action.route as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <View style={[styles.iconWrap, { backgroundColor: action.bg }]}>
          <Ionicons name={action.icon} size={22} color={action.tint} />
        </View>
        <Text style={styles.label}>{action.label}</Text>
        <Text style={styles.hint}>{action.hint}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QuickActions: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Aksi cepat</Text>
          <Text style={styles.subtitle}>Kelola uangmu dalam satu tap</Text>
        </View>
        <View style={styles.flashBadge}>
          <Ionicons name="flash" size={14} color={theme.colors.warning} />
        </View>
      </View>
      <View style={styles.row}>
        {ACTIONS.map((a, i) => (
          <QuickActionItem key={a.label} action={a} index={i} />
        ))}
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.lg,
    marginTop: -80, // Moved up to float over the deep gradient hero
    paddingHorizontal: 0,
    paddingVertical: theme.spacing.lg,
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
  flashBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.warning}1F`,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  item: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.shadow.sm,
  },
  touch: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.lg,
    borderRadius: 24,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    ...theme.typography.bodySmall,
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  hint: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
});

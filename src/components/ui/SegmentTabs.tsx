import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

interface SegmentTabsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  labelPrefix?: string;
}

export const SegmentTabs: React.FC<SegmentTabsProps> = ({ options, value, onChange, labelPrefix }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const indicatorX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  const handleLayout = useCallback((index: number) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    if (options[index].key === value) {
      indicatorX.value = x;
      tabWidth.value = width;
    }
  }, [value, options, indicatorX, tabWidth]);

  const handlePress = useCallback((key: string, index: number) => {
    if (key !== value) {
      hapticLight();
      onChange(key);
    }
  }, [value, onChange]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth.value,
  }));

  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <LinearGradient
          colors={theme.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.indicatorGradient}
        />
      </Animated.View>
      {options.map((o, index) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            style={styles.item}
            activeOpacity={0.8}
            onPress={() => handlePress(o.key, index)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              if (active) {
                indicatorX.value = withSpring(x, { damping: 18, stiffness: 180 });
                tabWidth.value = withSpring(width, { damping: 18, stiffness: 180 });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={labelPrefix ? `${labelPrefix} ${o.label}` : o.label}
          >
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.round,
    padding: 4,
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: theme.radius.round,
    overflow: 'hidden',
    zIndex: 0,
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: theme.radius.round,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.round,
    zIndex: 1,
  },
  text: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  textActive: { color: theme.colors.textOnPrimary, fontWeight: '700' },
});

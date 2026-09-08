import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme, type Theme } from '@/constants/theme';
import { shouldReduceMotion } from '@/utils/motion';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color, height = 8, style }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pct = Math.max(0, Math.min(100, progress));
  const widthSV = useSharedValue(0);

  useEffect(() => {
    widthSV.value = shouldReduceMotion()
      ? pct
      : withTiming(pct, { duration: 650 });
  }, [pct, widthSV]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthSV.value}%` as any,
  }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: height / 2,
            backgroundColor: color ?? theme.colors.primary,
          },
          fillStyle,
        ]}
      />
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
});

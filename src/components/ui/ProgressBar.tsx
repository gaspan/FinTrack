import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme, type Theme } from '@/constants/theme';

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

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.primary,
          transitionProperty: 'width',
          transitionDuration: 400,
          transitionTimingFunction: 'ease',
        }}
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

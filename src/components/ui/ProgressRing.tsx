import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 72,
  strokeWidth = 7,
  color,
  label,
  sublabel,
}) => {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const ringColor = color ?? theme.colors.primary;
  const offsetSV = useSharedValue(offset);

  useEffect(() => {
    offsetSV.value = withTiming(offset, { duration: 500 });
  }, [offset, offsetSV]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offsetSV.value,
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          {label != null && (
            <Text style={{ ...theme.typography.h3, fontSize: size * 0.26, color: theme.colors.textPrimary }}>
              {label}
            </Text>
          )}
          {sublabel != null && (
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }} numberOfLines={1}>
              {sublabel}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

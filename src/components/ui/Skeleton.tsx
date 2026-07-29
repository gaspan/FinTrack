import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: theme.colors.surfaceElevated, opacity }, style]}
    />
  );
};

export const DashboardSkeleton = () => {
  const { theme } = useTheme();
  return (
    <View style={{ padding: theme.spacing.md }}>
      <Skeleton height={24} width="40%" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="60%" style={{ marginBottom: theme.spacing.lg }} />
      <Skeleton height={100} style={{ marginBottom: theme.spacing.md, borderRadius: theme.radius.lg }} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Skeleton height={80} style={{ flex: 1, borderRadius: theme.radius.lg }} />
        <Skeleton height={80} style={{ flex: 1, borderRadius: theme.radius.lg }} />
      </View>
      <Skeleton height={200} style={{ marginTop: theme.spacing.lg, borderRadius: theme.radius.lg }} />
      <Skeleton height={200} style={{ marginTop: theme.spacing.md, borderRadius: theme.radius.lg }} />
    </View>
  );
};

export const ListSkeleton = () => {
  const { theme } = useTheme();
  return (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: theme.spacing.md }} />
          <View style={{ flex: 1 }}>
            <Skeleton height={14} width="50%" style={{ marginBottom: 6 }} />
            <Skeleton height={12} width="30%" />
          </View>
          <Skeleton height={16} width={80} borderRadius={4} />
        </View>
      ))}
    </View>
  );
};

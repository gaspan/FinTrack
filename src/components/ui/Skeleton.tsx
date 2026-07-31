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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          paddingTop: 64,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.lg,
          backgroundColor: theme.colors.surfaceElevated,
          borderBottomLeftRadius: theme.radius.xl,
          borderBottomRightRadius: theme.radius.xl,
        }}
      >
        <Skeleton height={20} width="45%" style={{ marginBottom: 6 }} />
        <Skeleton height={12} width="60%" style={{ marginBottom: theme.spacing.lg }} />
        <Skeleton height={12} width="30%" style={{ marginBottom: 8 }} />
        <Skeleton height={34} width="70%" style={{ marginBottom: theme.spacing.md }} />
        <Skeleton height={64} style={{ borderRadius: theme.radius.md }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: theme.spacing.md }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <Skeleton width={48} height={48} borderRadius={theme.radius.md} style={{ marginBottom: 6 }} />
            <Skeleton height={10} width={40} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.md }}>
        <Skeleton height={96} style={{ borderRadius: theme.radius.lg }} />
        <Skeleton height={220} style={{ borderRadius: theme.radius.lg }} />
      </View>
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

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';

interface SuccessAnimationProps {
  visible: boolean;
  message?: string;
  onFinish?: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ visible, message = 'Berhasil!', onFinish }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onFinish?.());
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.box, { transform: [{ scale }], opacity }]}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.income} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 26, 0.7)',
    zIndex: 999,
  },
  box: { alignItems: 'center' },
  iconCircle: { marginBottom: theme.spacing.md },
  message: { ...theme.typography.h3, color: theme.colors.textPrimary },
});

import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

const HIDDEN_ON = ['add'];

export const FAB = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const hidden = HIDDEN_ON.includes(segments[segments.length - 1] as string);

  const styles = useMemo(() => StyleSheet.create({
    fab: {
      position: 'absolute',
      right: theme.spacing.lg,
      bottom: Platform.OS === 'ios' ? 96 : 80,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
  }), [theme]);

  if (hidden) return null;

  return (
    <TouchableOpacity
      style={styles.fab}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Tambah transaksi"
      onPress={() => {
        hapticLight();
        router.push('/(tabs)/add' as any);
      }}
    >
      <Ionicons name="add" size={26} color="#FFF" />
    </TouchableOpacity>
  );
};

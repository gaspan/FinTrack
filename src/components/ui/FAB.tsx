import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';

export const FAB = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 80,
      alignSelf: 'center',
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
  }), [theme]);

  return (
    <TouchableOpacity
      style={styles.fab}
      activeOpacity={0.85}
      onPress={() => router.push('/(tabs)/add' as any)}
    >
      <Ionicons name="add" size={28} color="#FFF" />
    </TouchableOpacity>
  );
};
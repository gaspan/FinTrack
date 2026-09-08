import React, { useMemo, useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

const HIDDEN_ON = ['add'];

export const FAB = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const hidden = HIDDEN_ON.includes(segments[segments.length - 1] as string);
  const [pressed, setPressed] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    fabWrap: {
      position: 'absolute',
      left: theme.spacing.md,
      top: '50%',
      marginTop: -28,
      zIndex: 100,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.round,
      backgroundColor: `${theme.colors.primary}99`,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadow.md,
    },
  }), [theme]);

  if (hidden) return null;

  return (
    <Animated.View style={styles.fabWrap} entering={ZoomIn.duration(300)}>
      <Animated.View
        style={{
          transform: [{ scale: pressed ? 0.88 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 150,
          transitionTimingFunction: 'ease',
        }}
      >
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Tambah transaksi"
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() => {
            hapticLight();
            router.push('/(tabs)/add' as any);
          }}
        >
          <Ionicons name="add" size={26} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

import React, { useRef, useState, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

const HIDDEN_ON = ['add'];
const FAB_SIZE = 60;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define safe areas for dragging
const MIN_X = 16;
const MAX_X = SCREEN_WIDTH - FAB_SIZE - 16;
const MIN_Y = 100; // avoid top headers
const MAX_Y = SCREEN_HEIGHT - 120; // avoid bottom tabs

export const DraggableFAB = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const hidden = HIDDEN_ON.includes(segments[segments.length - 1] as string);

  const [pressed, setPressed] = useState(false);

  // Use a standard animated value for position
  const pan = useRef(new Animated.ValueXY({ x: MAX_X, y: SCREEN_HEIGHT - 160 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only become responder if the user has moved more than 10 pixels
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
        setPressed(true);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        setPressed(false);

        // Calculate where the FAB is dropped
        // @ts-ignore
        let currentX = pan.x._value;
        // @ts-ignore
        let currentY = pan.y._value;

        // Auto-snap to nearest horizontal edge (left or right)
        const snapX = currentX > SCREEN_WIDTH / 2 - FAB_SIZE / 2 ? MAX_X : MIN_X;
        
        // Constrain vertical bounds
        const snapY = Math.min(Math.max(currentY, MIN_Y), MAX_Y);

        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
    })
  ).current;

  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (hidden) return null;

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: pressed ? 0.92 : 1 }
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => {
          hapticLight();
          router.push('/(tabs)/add' as any);
        }}
      >
        <Ionicons name="add" size={32} color={theme.colors.textOnPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999, // Ensure it's above everything including tabs
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      }
    }),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  }
});

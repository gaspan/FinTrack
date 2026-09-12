import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Animated as RNAnimated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

const HIDDEN_ON = ['add'];
const FAB_SIZE = 60;
const MINI_SIZE = 44;
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
  const [expanded, setExpanded] = useState(false);

  // Pulse animation for the FAB ring
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.25, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Use a standard animated value for position
  const pan = useRef(new RNAnimated.ValueXY({ x: MAX_X, y: SCREEN_HEIGHT - 160 })).current;

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
        setExpanded(false);
      },
      onPanResponderMove: RNAnimated.event(
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

        RNAnimated.spring(pan, {
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

  const goAdd = () => {
    hapticLight();
    setExpanded(false);
    router.push('/(tabs)/add' as any);
  };

  const goScan = () => {
    hapticLight();
    setExpanded(false);
    router.push('/(tabs)/add?scan=1' as any);
  };

  return (
    <RNAnimated.View
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
      {expanded && (
        <TouchableOpacity
          style={styles.miniFab}
          activeOpacity={0.8}
          onPress={goScan}
          accessibilityLabel="Scan struk"
        >
          <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      )}

      <View style={styles.fabWrapper}>
        {/* Pulse ring */}
        <RNAnimated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.25],
                outputRange: [0.4, 0],
              }),
            },
          ]}
        />
        <TouchableOpacity
          style={styles.fabTouchable}
          activeOpacity={0.85}
          onPress={() => (expanded ? setExpanded(false) : goAdd())}
          onLongPress={() => {
            hapticLight();
            setExpanded((v) => !v);
          }}
          delayLongPress={320}
        >
          <LinearGradient
            colors={theme.colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, pressed && styles.fabPressed]}
          >
            <Ionicons
              name={expanded ? 'close' : 'add'}
              size={30}
              color={theme.colors.textOnPrimary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </RNAnimated.View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999, // Ensure it's above everything including tabs
    alignItems: 'flex-end',
    gap: 10,
  },
  fabWrapper: {
    width: FAB_SIZE + 20,
    height: FAB_SIZE + 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: FAB_SIZE + 16,
    height: FAB_SIZE + 16,
    borderRadius: (FAB_SIZE + 16) / 2,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  fabTouchable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      }
    }),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fabPressed: { opacity: 0.9 },
  miniFab: {
    width: MINI_SIZE,
    height: MINI_SIZE,
    borderRadius: MINI_SIZE / 2,
    backgroundColor: theme.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadow.md,
    alignSelf: 'center',
    marginRight: 8,
  },
});

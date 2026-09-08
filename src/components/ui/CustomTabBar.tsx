import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

/**
 * Tipe struktural minimal untuk custom tab bar.
 * (expo-router 57 mem-vendor navigasi sendiri & tak lagi menyertakan
 * `@react-navigation/bottom-tabs`, jadi tipe didefinisikan lokal.)
 */
interface BottomTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string; tabBarTestID?: string } }>;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string, params?: object) => void;
  };
}

const TabBarIcon = ({
  routeName,
  isFocused,
  color,
  theme,
}: {
  routeName: string;
  isFocused: boolean;
  color: string;
  theme: Theme;
}) => {
  const scale = useSharedValue(isFocused ? 1.2 : 1);
  const opacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.2 : 1, { damping: 12, stiffness: 200 });
    opacity.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
  }, [isFocused, scale, opacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: opacity.value }],
  }));

  let iconName = 'grid-outline';
  let activeIconName = 'grid';
  if (routeName === 'transactions') {
    iconName = 'receipt-outline';
    activeIconName = 'receipt';
  } else if (routeName === 'budget') {
    iconName = 'wallet-outline';
    activeIconName = 'wallet';
  } else if (routeName === 'settings') {
    iconName = 'settings-outline';
    activeIconName = 'settings';
  }

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={[styles.activeGlow, { backgroundColor: `${theme.colors.primary}20` }, animatedDotStyle]} />
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={(isFocused ? activeIconName : iconName) as any}
          size={24}
          color={color}
        />
      </Animated.View>
    </View>
  );
};

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          
          if (route.name === 'add') return null; // We use DraggableFAB for this

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              hapticLight();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = isFocused ? theme.colors.primary : theme.colors.textSecondary;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <TabBarIcon
                routeName={route.name}
                isFocused={isFocused}
                color={color}
                theme={theme}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  }
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      }
    }),
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

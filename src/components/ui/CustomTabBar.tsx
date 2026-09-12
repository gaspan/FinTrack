import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
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

const TAB_LABELS: Record<string, string> = {
  index: 'Beranda',
  transactions: 'Riwayat',
  budget: 'Anggaran',
  settings: 'Lainnya',
};

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
  const scale = useSharedValue(isFocused ? 1.15 : 1);
  const glowOpacity = useSharedValue(isFocused ? 1 : 0);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 14, stiffness: 220 });
    glowOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
    labelOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, scale, glowOpacity, labelOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 0.8 + glowOpacity.value * 0.2 }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: (1 - labelOpacity.value) * 4 }],
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
    <View style={iconStyles.iconWrap}>
      <Animated.View style={[iconStyles.activeGlow, { backgroundColor: `${theme.colors.primary}18` }, animatedGlowStyle]} />
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={(isFocused ? activeIconName : iconName) as any}
          size={22}
          color={color}
        />
      </Animated.View>
      <Animated.Text style={[iconStyles.label, { color }, animatedLabelStyle]}>
        {TAB_LABELS[routeName] || ''}
      </Animated.Text>
    </View>
  );
};

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const currentRoute = state.routes[state.index]?.name;
  if (currentRoute === 'add') return null;

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

          const color = isFocused ? theme.colors.primary : theme.colors.textMuted;

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

const iconStyles = StyleSheet.create({
  iconWrap: {
    width: 56,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    top: -2,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: {
        elevation: 20,
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

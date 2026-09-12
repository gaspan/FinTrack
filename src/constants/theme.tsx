import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

const makeTypography = (primary: string, secondary: string) => ({
  h1: { fontSize: 32, fontWeight: 'bold' as const, fontFamily: fonts.bold, letterSpacing: -0.8, color: primary },
  h2: { fontSize: 24, fontWeight: 'bold' as const, fontFamily: fonts.bold, letterSpacing: -0.5, color: primary },
  h3: { fontSize: 20, fontWeight: '600' as const, fontFamily: fonts.semibold, letterSpacing: -0.3, color: primary },
  subtitle: { fontSize: 16, fontWeight: '500' as const, fontFamily: fonts.medium, color: secondary },
  body: { fontSize: 14, fontWeight: '400' as const, fontFamily: fonts.regular, color: primary },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, fontFamily: fonts.regular, color: secondary },
  caption: { fontSize: 10, fontWeight: '400' as const, fontFamily: fonts.regular, color: secondary },
  amount: { fontSize: 34, fontWeight: 'bold' as const, fontFamily: fonts.bold, letterSpacing: -1, color: primary },
  amountLarge: { fontSize: 44, fontWeight: 'bold' as const, fontFamily: fonts.bold, letterSpacing: -1.5, color: primary },
});

export const darkTheme = {
  colors: {
    background: '#080A14',
    surface: '#10132A',
    surfaceElevated: '#181D3A',
    surfaceCard: '#1A1F40',
    surfaceGlass: 'rgba(255, 255, 255, 0.06)',
    primary: '#7B61FF',
    primaryMuted: '#6952DB',
    primaryGradient: ['#7B61FF', '#A78BFA'] as readonly [string, string],
    heroGradient: ['#6C54E8', '#4F3CC0'] as readonly [string, string],
    accent: '#6366F1',
    accentGold: '#D4A574',
    accentGoldGradient: ['#D4A574', '#E8C99B'] as readonly [string, string],
    income: '#4ADE80',
    incomeGradient: ['#4ADE80', '#22C55E'] as readonly [string, string],
    expense: '#F87171',
    expenseGradient: ['#F87171', '#EF4444'] as readonly [string, string],
    textPrimary: '#F0F0F5',
    textSecondary: '#7A7F9E',
    textMuted: '#4A4F6A',
    textOnPrimary: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.06)',
    borderSubtle: 'rgba(255, 255, 255, 0.03)',
    danger: '#F43F5E',
    warning: '#FBBF24',
    success: '#34D399',
    info: '#38BDF8',
    track: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shimmer: 'rgba(255, 255, 255, 0.05)',
    inputFocus: 'rgba(123, 97, 255, 0.25)',
    cardGlow: 'rgba(123, 97, 255, 0.08)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    round: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 12,
    },
    glow: {
      shadowColor: '#7B61FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    goldGlow: {
      shadowColor: '#D4A574',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  typography: makeTypography('#F0F0F5', '#7A7F9E'),
};

export const lightTheme = {
  colors: {
    background: '#F5F5FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F0F7',
    surfaceCard: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.65)',
    primary: '#7B61FF',
    primaryMuted: '#9B8AE0',
    primaryGradient: ['#7B61FF', '#A78BFA'] as readonly [string, string],
    heroGradient: ['#6C54E8', '#4F3CC0'] as readonly [string, string],
    accent: '#6366F1',
    accentGold: '#C49A5C',
    accentGoldGradient: ['#C49A5C', '#D4A574'] as readonly [string, string],
    income: '#22C55E',
    incomeGradient: ['#22C55E', '#16A34A'] as readonly [string, string],
    expense: '#EF4444',
    expenseGradient: ['#EF4444', '#DC2626'] as readonly [string, string],
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.06)',
    borderSubtle: 'rgba(0, 0, 0, 0.03)',
    danger: '#F43F5E',
    warning: '#FBBF24',
    success: '#34D399',
    info: '#38BDF8',
    track: 'rgba(0, 0, 0, 0.06)',
    glass: 'rgba(255, 255, 255, 0.70)',
    glassBorder: 'rgba(255, 255, 255, 0.85)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shimmer: 'rgba(255, 255, 255, 0.5)',
    inputFocus: 'rgba(123, 97, 255, 0.15)',
    cardGlow: 'rgba(123, 97, 255, 0.06)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    round: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 14,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 10,
    },
    glow: {
      shadowColor: '#7B61FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.20,
      shadowRadius: 14,
      elevation: 6,
    },
    goldGlow: {
      shadowColor: '#C49A5C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
  },
  typography: makeTypography('#1A1A2E', '#6B7280'),
};

type ThemeName = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  isDark: boolean;
  theme: typeof darkTheme;
  themeName: ThemeName;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

async function getSavedTheme(): Promise<ThemeName> {
  try {
    const saved = await AsyncStorage.getItem('theme_preference');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'auto';
}

async function saveTheme(name: ThemeName) {
  try {
    await AsyncStorage.setItem('theme_preference', name);
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    () => Appearance.getColorScheme() ?? 'light'
  );
  const [themeName, setThemeName] = useState<ThemeName>('auto');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    getSavedTheme().then((saved) => {
      setThemeName(saved);
      setMounted(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeName((prev) => {
      const order: ThemeName[] = ['auto', 'dark', 'light'];
      const idx = order.indexOf(prev);
      const next = order[(idx + 1) % order.length];
      saveTheme(next);
      return next;
    });
  }, []);

  const isDark = useMemo(() => {
    if (themeName === 'auto') {
      return systemColorScheme === 'dark';
    }
    return themeName === 'dark';
  }, [themeName, systemColorScheme]);

  const value = useMemo<ThemeContextType>(() => ({
    isDark,
    theme: isDark ? darkTheme : lightTheme,
    themeName,
    toggleTheme,
    cycleTheme,
  }), [isDark, themeName, toggleTheme, cycleTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export type Theme = typeof darkTheme;
export type { ThemeName, ThemeContextType };

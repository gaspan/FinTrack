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
});

export const darkTheme = {
  colors: {
    background: '#0A0E1A',
    surface: '#141828',
    surfaceElevated: '#1C2237',
    primary: '#00D09C',
    primaryGradient: ['#00D09C', '#00B4D8'] as const,
    heroGradient: ['#00B37E', '#00A0C4'] as readonly [string, string],
    income: '#00D09C',
    expense: '#FF6B6B',
    textPrimary: '#FFFFFF',
    textSecondary: '#8B95B0',
    textMuted: '#5A6480',
    textOnPrimary: '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.08)',
    danger: '#FF4C4C',
    warning: '#FBBF24',
    success: '#34D399',
    info: '#38BDF8',
    accent: '#6366F1',
    track: 'rgba(255, 255, 255, 0.10)',
    glass: 'rgba(255, 255, 255, 0.14)',
    glassBorder: 'rgba(255, 255, 255, 0.22)',
    overlay: 'rgba(0, 0, 0, 0.6)',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.24,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  typography: makeTypography('#FFFFFF', '#8B95B0'),
};

export const lightTheme = {
  colors: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F3F5',
    primary: '#00D09C',
    primaryGradient: ['#00D09C', '#00B4D8'] as const,
    heroGradient: ['#00C08F', '#00A8CC'] as readonly [string, string],
    income: '#00D09C',
    expense: '#FF6B6B',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.08)',
    danger: '#FF4C4C',
    warning: '#FBBF24',
    success: '#34D399',
    info: '#38BDF8',
    accent: '#6366F1',
    track: 'rgba(0, 0, 0, 0.07)',
    glass: 'rgba(255, 255, 255, 0.20)',
    glassBorder: 'rgba(255, 255, 255, 0.35)',
    overlay: 'rgba(0, 0, 0, 0.45)',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 6,
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

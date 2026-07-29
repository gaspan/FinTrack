import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const darkTheme = {
  colors: {
    background: '#0A0E1A',
    surface: '#141828',
    surfaceElevated: '#1C2237',
    primary: '#00D09C',
    primaryGradient: ['#00D09C', '#00B4D8'] as const,
    income: '#00D09C',
    expense: '#FF6B6B',
    textPrimary: '#FFFFFF',
    textSecondary: '#8B95B0',
    border: 'rgba(255, 255, 255, 0.08)',
    danger: '#FF4C4C',
    warning: '#FBBF24',
    success: '#34D399',
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
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' as const, color: '#FFFFFF' },
    h2: { fontSize: 24, fontWeight: 'bold' as const, color: '#FFFFFF' },
    h3: { fontSize: 20, fontWeight: '600' as const, color: '#FFFFFF' },
    subtitle: { fontSize: 16, fontWeight: '500' as const, color: '#8B95B0' },
    body: { fontSize: 14, fontWeight: '400' as const, color: '#FFFFFF' },
    bodySmall: { fontSize: 12, fontWeight: '400' as const, color: '#8B95B0' },
    caption: { fontSize: 10, fontWeight: '400' as const, color: '#8B95B0' },
  },
};

export const lightTheme = {
  colors: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F3F5',
    primary: '#00D09C',
    primaryGradient: ['#00D09C', '#00B4D8'] as const,
    income: '#00D09C',
    expense: '#FF6B6B',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    border: 'rgba(0, 0, 0, 0.08)',
    danger: '#FF4C4C',
    warning: '#FBBF24',
    success: '#34D399',
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
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' as const, color: '#1A1A2E' },
    h2: { fontSize: 24, fontWeight: 'bold' as const, color: '#1A1A2E' },
    h3: { fontSize: 20, fontWeight: '600' as const, color: '#1A1A2E' },
    subtitle: { fontSize: 16, fontWeight: '500' as const, color: '#6B7280' },
    body: { fontSize: 14, fontWeight: '400' as const, color: '#1A1A2E' },
    bodySmall: { fontSize: 12, fontWeight: '400' as const, color: '#6B7280' },
    caption: { fontSize: 10, fontWeight: '400' as const, color: '#6B7280' },
  },
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
  const systemColorScheme = Appearance.getColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>('auto');
  const [mounted, setMounted] = useState(false);

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

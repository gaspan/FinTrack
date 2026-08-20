import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import 'react-native-reanimated';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateDbIfNeeded } from '@/lib/database';
import { ThemeProvider, useTheme } from '@/constants/theme';
import { getStoredPin } from '@/lib/lockStorage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { bootCheckpoint, markBootOk, shouldShowBootDiagnostic, ackBootDiagnostic } from '@/lib/bootLog';

// Fire-and-forget: mark that the JS module was evaluated.
// This is intentionally NOT awaited — it's a best-effort timestamp.
bootCheckpoint('module_eval');

SplashScreen.preventAutoHideAsync();

// ─── Navigation tree ──────────────────────────────────────────────────
// Pure render component — no side-effects.
function NavigationStack() {
  const { theme, isDark } = useTheme();
  const navTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surfaceElevated },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { color: theme.colors.textPrimary },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="lock-screen" options={{ headerShown: false }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', headerShown: true, title: 'Detail Transaksi' }} />
        <Stack.Screen name="transaction/edit/[id]" options={{ presentation: 'modal', headerShown: true, title: 'Edit Transaksi' }} />
        <Stack.Screen name="goals" options={{ presentation: 'modal', headerShown: true, title: 'Target Menabung' }} />
        <Stack.Screen name="reminders" options={{ presentation: 'modal', headerShown: true, title: 'Pengingat Tagihan' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal', headerShown: true, title: 'Impor CSV' }} />
        <Stack.Screen name="lock" options={{ presentation: 'modal', headerShown: true, title: 'Kunci Aplikasi' }} />
        <Stack.Screen name="annual" options={{ presentation: 'modal', headerShown: true, title: 'Laporan Tahunan' }} />
        <Stack.Screen name="export" options={{ presentation: 'modal', headerShown: true, title: 'Ekspor Laporan' }} />
        <Stack.Screen name="recurring" options={{ presentation: 'modal', headerShown: true, title: 'Transaksi Berulang' }} />
        <Stack.Screen name="transfer" options={{ presentation: 'modal', headerShown: true, title: 'Transfer Dompet' }} />
        <Stack.Screen name="wallets" options={{ presentation: 'modal', headerShown: true, title: 'Manajemen Dompet' }} />
        <Stack.Screen name="categories" options={{ presentation: 'modal', headerShown: true, title: 'Manajemen Kategori' }} />
        <Stack.Screen name="cloud-backup" options={{ presentation: 'modal', headerShown: true, title: 'Backup Cloud' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

// ─── Root content ─────────────────────────────────────────────────────
// Manages fonts, DB init, onboarding/pin check, and splash hiding.
// Uses SQLiteProvider WITHOUT useSuspense to avoid Suspense
// unmount/remount cycles that were causing the init loop.
function RootContent() {
  const { theme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });

  const [dbReady, setDbReady] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Guard: only run DB init once even if SQLiteProvider re-triggers onInit.
  const dbInitDone = useRef(false);
  const handleDbInit = useCallback(async (db: SQLiteDatabase) => {
    if (dbInitDone.current) return;
    dbInitDone.current = true;
    try {
      await bootCheckpoint('db_init_start');
      await migrateDbIfNeeded(db);
      await bootCheckpoint('db_init_done');
      setDbReady(true);
    } catch (e) {
      dbInitDone.current = false;
      await bootCheckpoint('db_init_error: ' + (e as Error).message);
      throw e;
    }
  }, []);

  // Handle SQLiteProvider errors (non-suspense mode)
  const handleDbError = useCallback((error: Error) => {
    console.error('DB init error:', error);
    bootCheckpoint('db_error: ' + error.message);
    setInitError(error);
    SplashScreen.hideAsync();
  }, []);

  // Boot sequence: runs once after BOTH fonts and DB are ready.
  // This runs outside any Suspense boundary so it cannot be torn down.
  useEffect(() => {
    if (!loaded || !dbReady) return;
    let isMounted = true;

    async function boot() {
      try {
        // Show boot diagnostic if previous boot crashed
        const diag = await shouldShowBootDiagnostic();
        if (diag) {
          Alert.alert('Diagnostik boot', `Boot terakhir berhenti di langkah:\n${diag}`);
          ackBootDiagnostic(diag);
        }

        await bootCheckpoint('fonts_loaded');
        const done = await AsyncStorage.getItem('onboarding_done');
        await bootCheckpoint('onboarding_read');

        let pin: string | null = null;
        try { pin = await getStoredPin(); } catch { pin = null; }
        await bootCheckpoint('pin_read');

        if (!isMounted) return;

        // Mark boot as OK here — previously this only happened in tabs,
        // which was never reached when the lock screen was shown.
        await markBootOk();

        SplashScreen.hideAsync();
        setBootDone(true);

        if (done !== 'true') {
          router.replace('/onboarding');
        } else if (pin) {
          router.replace('/lock-screen');
        }
      } catch (e) {
        console.error('Boot error:', e);
        bootCheckpoint('init_error: ' + (e as Error).message);
        if (isMounted) {
          setInitError(e as Error);
          SplashScreen.hideAsync();
          setBootDone(true);
        }
      }
    }

    boot();
    return () => { isMounted = false; };
  }, [loaded, dbReady]);

  // Phase 1: waiting for fonts
  if (!loaded) {
    return null;
  }

  // Phase 2: error state
  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: 24 }}>
        <Text style={{ color: theme.colors.textPrimary, textAlign: 'center' }}>
          Gagal memuat aplikasi.{'\n\n'}{initError.message}
        </Text>
      </View>
    );
  }

  // Phase 3: SQLiteProvider (non-suspense) opens the DB and calls onInit.
  // Once onInit completes successfully, dbReady becomes true and the boot
  // effect runs. Until bootDone is true we show a loading indicator.
  return (
    <SQLiteProvider
      databaseName="fintrack.db"
      onInit={handleDbInit}
      onError={handleDbError}
    >
      {bootDone ? (
        <NavigationStack />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </SQLiteProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
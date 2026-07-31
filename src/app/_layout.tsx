import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, Suspense, useState, useCallback, useRef } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import 'react-native-reanimated';
import { View, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateDbIfNeeded } from '@/lib/database';
import { ThemeProvider, useTheme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function RootContent() {
  const { theme, isDark } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });

  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        if (!loaded) return;
        const done = await AsyncStorage.getItem('onboarding_done');
        const pin = await AsyncStorage.getItem('app_pin_hash');
        if (!isMounted) return;

        SplashScreen.hideAsync();
        setReady(true);

        if (done !== 'true') {
          router.replace('/onboarding');
        } else if (pin) {
          router.replace('/lock-screen');
        }
      } catch (e) {
        console.error('Init error:', e);
        if (isMounted) {
          setInitError(e as Error);
          SplashScreen.hideAsync();
          setReady(true);
        }
      }
    }
    init();
    return () => { isMounted = false; };
  }, [loaded]);

  if (!loaded || !ready) {
    return null;
  }

  const navTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavThemeProvider value={navTheme}>
      {initError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <Text style={{ color: theme.colors.textPrimary }}>Gagal memuat aplikasi. Silakan restart.</Text>
        </View>
      ) : (
        <>
          <Suspense fallback={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          }>
            <SQLiteProvider databaseName="fintrack.db" onInit={migrateDbIfNeeded} useSuspense>
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
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              </Stack>
            </SQLiteProvider>
          </Suspense>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </>
      )}
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}
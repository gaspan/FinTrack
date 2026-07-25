import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DarkTheme, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, Suspense, useState } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import 'react-native-reanimated';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateDbIfNeeded } from '@/lib/database';
import { theme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      AsyncStorage.getItem('onboarding_done').then(val => {
        if (val !== 'true') {
          router.replace('/onboarding');
        }
        setOnboardingDone(true);
      });
    }
  }, [loaded]);

  if (!loaded || onboardingDone === null) {
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Suspense fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      }>
        <SQLiteProvider databaseName="fintrack.db" onInit={migrateDbIfNeeded} useSuspense>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen 
              name="transaction/[id]" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Detail Transaksi',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="transaction/edit/[id]" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Edit Transaksi',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="export" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Ekspor Laporan',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="recurring" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Transaksi Berulang',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="transfer" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Transfer Dompet',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="wallets" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Manajemen Dompet',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="categories" 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Manajemen Kategori',
                headerStyle: { backgroundColor: theme.colors.surfaceElevated },
                headerTintColor: theme.colors.textPrimary
              }} 
            />
            <Stack.Screen 
              name="onboarding" 
              options={{ headerShown: false }} 
            />
          </Stack>
        </SQLiteProvider>
      </Suspense>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';

import { useTheme } from '@/constants/theme';
import { RecurringEngine } from '@/features/recurring/recurringEngine';
import { checkBudgetAlerts } from '@/features/notifications/budgetReminder';
import { RolloverEngine } from '@/features/rollover/rolloverEngine';
import { checkAndBackup } from '@/features/cloud-backup/backupScheduler';
import { checkBackupReminder } from '@/features/cloud-backup/backupReminder';
import { reconcileWalletBalances } from '@/features/wallets/reconcile';
import {
  configureNotificationHandler,
  setupNotificationChannels,
  requestNotificationPermission,
  rescheduleAllReminders,
} from '@/features/notifications/localNotifications';
import { bootCheckpoint, markBootOk } from '@/lib/bootLog';
import { SubscriptionQueries, NetWorthQueries } from '@/lib/queries';
import { FAB } from '@/components/ui/FAB';

export default function TabLayout() {
  const { theme } = useTheme();
  const db = useSQLiteContext();

  useEffect(() => {
    bootCheckpoint('tabs_mounted');
    configureNotificationHandler();
    setupNotificationChannels();
    requestNotificationPermission();

    const engine = new RecurringEngine(db);
    engine.processRecurringTransactions()
      .then(() => new RolloverEngine(db).process())
      .then(() => checkBudgetAlerts(db))
      .then(() => new SubscriptionQueries(db).processRenewals())
      .then(() => new NetWorthQueries(db).ensureMonthlySnapshot())
      .then(() => reconcileWalletBalances(db))
      .then(() => rescheduleAllReminders(db))
      .then(() => checkAndBackup(db))
      .then(() => checkBackupReminder())
      .then(() => markBootOk())
      .catch((e) => {
        console.error(e);
        bootCheckpoint('engine_error: ' + (e as Error).message);
      });
  }, [db]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          tabBarStyle: Platform.select({
            default: { backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border },
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} /> }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Riwayat',
            tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
            headerRight: () => (
              <Ionicons
                name="calendar-outline"
                size={22}
                color={theme.colors.primary}
                style={{ marginRight: 16 }}
                onPress={() => router.push('/transactions/calendar' as any)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{ title: '', tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="budget"
          options={{ title: 'Anggaran', tabBarIcon: ({ color }) => <Ionicons name="wallet" size={24} color={color} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Pengaturan', tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} /> }}
        />
      </Tabs>
      <FAB />
    </View>
  );
}

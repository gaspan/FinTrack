import { Platform } from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import dayjs from 'dayjs';

export const NOTIF_ENABLED_KEY = 'notif_enabled';
export const DAILY_REMINDER_KEY = 'daily_reminder_enabled';
export const DAILY_REMINDER_TIME_KEY = 'daily_reminder_time';

const CHANNEL_BUDGET = 'budget_alerts';
const CHANNEL_BILLS = 'bill_reminders';
const CHANNEL_DAILY = 'daily_reminder';
const CHANNEL_SUBS = 'subscription_renewals';

// expo-notifications crashes on Android in Expo Go (no FCM). Detect Expo Go via
// the native module check (same source of truth used by expo-notifications).
type NotificationsModule = typeof import('expo-notifications');

const isAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();

let Notifications: NotificationsModule | null = null;

// Lazy init: never touches the native module at module scope, and never on
// Android Expo Go. Safe no-op everywhere the module is unavailable.
function getNotifications(): NotificationsModule | null {
  if (Notifications) return Notifications;
  if (isAndroidExpoGo) return null;
  try {
    Notifications = require('expo-notifications');
  } catch {
    Notifications = null;
  }
  return Notifications;
}

export function configureNotificationHandler() {
  const mod = getNotifications();
  if (!mod) return;
  try {
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export async function setupNotificationChannels() {
  const mod = getNotifications();
  if (!mod || Platform.OS !== 'android') return;
  const channels = [
    { id: CHANNEL_BUDGET, name: 'Peringatan Anggaran' },
    { id: CHANNEL_BILLS, name: 'Pengingat Tagihan' },
    { id: CHANNEL_DAILY, name: 'Pengingat Harian' },
    { id: CHANNEL_SUBS, name: 'Langganan' },
  ];
  for (const ch of channels) {
    try {
      await mod.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        importance: mod.AndroidImportance.HIGH,
      });
    } catch {}
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const mod = getNotifications();
  if (!mod) return false;
  try {
    const { status: existing } = await mod.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await mod.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function isNotifEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIF_ENABLED_KEY);
  return val !== 'false';
}

export async function isDailyReminderEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(DAILY_REMINDER_KEY);
  return val === 'true';
}

export async function getDailyReminderTime(): Promise<{ hour: number; minute: number }> {
  const raw = await AsyncStorage.getItem(DAILY_REMINDER_TIME_KEY);
  if (raw) {
    const [h, m] = raw.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) return { hour: h, minute: m };
  }
  return { hour: 20, minute: 0 };
}

export async function scheduleBudgetAlert(categoryName: string, spent: number, limit: number, pct: number) {
  const mod = getNotifications();
  if (!mod || !(await isNotifEnabled())) return;
  const label = pct >= 100 ? 'Melebihi batas' : `${pct.toFixed(0)}% terpakai`;
  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: pct >= 100 ? '⛔ Anggaran terlampaui' : '⚠️ Anggaran hampir habis',
        body: `${categoryName}: ${label}. Sisa ${Math.max(0, limit - spent).toLocaleString('id-ID')}`,
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: CHANNEL_BUDGET,
      },
    });
  } catch {}
}

export async function scheduleBillReminder(id: number, name: string, dueDate: string) {
  const mod = getNotifications();
  if (!mod || !(await isNotifEnabled())) return;
  const triggerDate = dayjs(dueDate).subtract(1, 'day').hour(9).minute(0).toDate();
  if (triggerDate <= new Date()) return;

  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: '📅 Tagihan besok',
        body: `${name} jatuh tempo ${dayjs(dueDate).format('DD MMM YYYY')}`,
        data: { billId: id },
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: CHANNEL_BILLS,
      },
    });
  } catch {}
}

export async function cancelBillReminder(id: number) {
  const mod = getNotifications();
  if (!mod) return;
  try {
    const all = await mod.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.billId === id) {
        await mod.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

export async function scheduleSubscriptionReminder(id: number, name: string, nextBilling: string) {
  const mod = getNotifications();
  if (!mod || !(await isNotifEnabled())) return;
  const triggerDate = dayjs(nextBilling).subtract(1, 'day').hour(9).minute(0).toDate();
  if (triggerDate <= new Date()) return;

  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: '💳 Langganan besok',
        body: `${name} akan diperpanjang ${dayjs(nextBilling).format('DD MMM YYYY')}`,
        data: { subId: id },
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: CHANNEL_SUBS,
      },
    });
  } catch {}
}

export async function cancelSubscriptionReminder(id: number) {
  const mod = getNotifications();
  if (!mod) return;
  try {
    const all = await mod.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.subId === id) {
        await mod.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

export async function scheduleDailyReminder() {
  const mod = getNotifications();
  if (!mod || !(await isNotifEnabled()) || !(await isDailyReminderEnabled())) return;
  const { hour, minute } = await getDailyReminderTime();

  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: '📝 Catat pengeluaran hari ini',
        body: 'Jangan lupa mencatat semua transaksi hari ini!',
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_DAILY,
      },
    });
  } catch {}
}

export async function cancelAllReminders() {
  const mod = getNotifications();
  if (!mod) return;
  try {
    await mod.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export async function rescheduleAllReminders(db: SQLiteDatabase) {
  const mod = getNotifications();
  if (!mod) return;

  if (!(await isNotifEnabled())) {
    await cancelAllReminders();
    return;
  }

  await cancelAllReminders();

  const billReminders = await db.getAllAsync<{ id: number; name: string; due_date: string; is_paid: number }>(
    'SELECT id, name, due_date, is_paid FROM bill_reminders WHERE is_paid = 0'
  );
  for (const b of billReminders) {
    await scheduleBillReminder(b.id, b.name, b.due_date);
  }

  const subs = await db.getAllAsync<{ id: number; name: string; next_billing_date: string; is_active: number }>(
    'SELECT id, name, next_billing_date, is_active FROM subscriptions WHERE is_active = 1'
  );
  for (const s of subs) {
    await scheduleSubscriptionReminder(s.id, s.name, s.next_billing_date);
  }

  await scheduleDailyReminder();
}

import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performLocalBackup } from '@/features/export/backupRestore';
import { saveToCloudStorage } from '@/features/cloud-backup/cloudStorage';

export const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';
export const BACKUP_INTERVAL_KEY = 'backup_interval_days';
export const LAST_AUTO_BACKUP_KEY = 'last_auto_backup_date';

export const BACKUP_INTERVALS: { label: string; days: number }[] = [
  { label: 'Harian', days: 1 },
  { label: 'Mingguan', days: 7 },
  { label: 'Bulanan', days: 30 },
];

export async function checkAndBackup(db: SQLiteDatabase): Promise<void> {
  try {
    const enabled = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    if (enabled !== 'true') return;

    const intervalDays = Number(await AsyncStorage.getItem(BACKUP_INTERVAL_KEY)) || 7;
    const last = await AsyncStorage.getItem(LAST_AUTO_BACKUP_KEY);
    if (last && dayjs().diff(dayjs(last), 'day') < intervalDays) return;

    const filePath = await performLocalBackup(db);
    await saveToCloudStorage(filePath).catch(() => {});
    await AsyncStorage.setItem(LAST_AUTO_BACKUP_KEY, dayjs().format('YYYY-MM-DD'));
  } catch (e) {
    console.error('Auto backup failed:', e);
  }
}

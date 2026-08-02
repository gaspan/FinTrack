import { Alert } from 'react-native';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LAST_BACKUP_DATE_KEY } from '@/features/export/backupRestore';
import { AUTO_BACKUP_ENABLED_KEY } from '@/features/cloud-backup/backupScheduler';

export async function checkBackupReminder() {
  try {
    const autoEnabled = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    if (autoEnabled === 'true') return;

    const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_DATE_KEY);
    if (lastBackup && dayjs().diff(dayjs(lastBackup), 'day') < 7) return;

    Alert.alert(
      '💾 Backup Data',
      'Sudah lebih dari 7 hari sejak backup terakhir. Cadangkan data kamu di Pengaturan > Data agar tetap aman.',
      [
        { text: 'Nanti', style: 'cancel' },
        { text: 'Buka Pengaturan', style: 'default', onPress: () => router.navigate('/(tabs)/settings' as any) },
      ]
    );
  } catch {
  }
}

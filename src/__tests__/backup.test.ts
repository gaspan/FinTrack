import dayjs from 'dayjs';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { gatherBackupData, performLocalBackup, exportBackup, LAST_BACKUP_DATE_KEY } from '@/features/export/backupRestore';
import { checkAndBackup, AUTO_BACKUP_ENABLED_KEY, BACKUP_INTERVAL_KEY, LAST_AUTO_BACKUP_KEY } from '@/features/cloud-backup/backupScheduler';
import { saveToGoogleDrive } from '@/features/cloud-backup/cloudStorage';

jest.mock('@/features/cloud-backup/cloudStorage', () => {
  const actual = jest.requireActual('@/features/cloud-backup/cloudStorage');
  return { ...actual, saveToCloudStorage: jest.fn().mockResolvedValue(undefined) };
});

const db = {
  getAllAsync: jest.fn().mockResolvedValue([]),
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('backupRestore', () => {
  it('gatherBackupData mengumpulkan seluruh tabel dengan versi 4', async () => {
    const data = await gatherBackupData(db);

    expect(data.version).toBe(4);
    expect(data.wallets).toEqual([]);
    expect(data.transactions).toEqual([]);
    expect(data.tags).toEqual([]);
    expect(data.transaction_tags).toEqual([]);
    expect(data.transaction_attachments).toEqual([]);
    expect(data.settings).toBeDefined();
    expect(db.getAllAsync).toHaveBeenCalled();
  });

  it('performLocalBackup menulis file JSON dan mencatat tanggal backup', async () => {
    const path = await performLocalBackup(db);

    expect(path).toContain('FinTrack_AutoBackup_');
    expect(path).toContain('.json');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LAST_BACKUP_DATE_KEY, dayjs().format('YYYY-MM-DD'));
  });

  it('exportBackup menulis file dan membuka share sheet', async () => {
    await exportBackup(db);

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalled();
  });
});

describe('checkAndBackup', () => {
  it('tidak melakukan backup jika auto backup nonaktif', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

    await checkAndBackup(db);

    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('melakukan backup saat diaktifkan dan belum pernah backup', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === AUTO_BACKUP_ENABLED_KEY) return Promise.resolve('true');
      if (key === BACKUP_INTERVAL_KEY) return Promise.resolve(null);
      if (key === LAST_AUTO_BACKUP_KEY) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    await checkAndBackup(db);

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LAST_AUTO_BACKUP_KEY, dayjs().format('YYYY-MM-DD'));
  });

  it('melewati backup jika masih dalam interval', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === AUTO_BACKUP_ENABLED_KEY) return Promise.resolve('true');
      if (key === BACKUP_INTERVAL_KEY) return Promise.resolve('7');
      if (key === LAST_AUTO_BACKUP_KEY) return Promise.resolve(dayjs().format('YYYY-MM-DD'));
      return Promise.resolve(null);
    });

    await checkAndBackup(db);

    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('melakukan backup jika melewati interval', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === AUTO_BACKUP_ENABLED_KEY) return Promise.resolve('true');
      if (key === BACKUP_INTERVAL_KEY) return Promise.resolve('7');
      if (key === LAST_AUTO_BACKUP_KEY) return Promise.resolve(dayjs().subtract(10, 'day').format('YYYY-MM-DD'));
      return Promise.resolve(null);
    });

    await checkAndBackup(db);

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
  });
});

describe('saveToGoogleDrive', () => {
  const SAF = FileSystem.StorageAccessFramework;

  it('meminta izin folder pertama kali lalu menyimpan file', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (SAF.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, directoryUri: 'content://drive/folder' });
    (SAF.createFileAsync as jest.Mock).mockResolvedValue('content://drive/folder/backup.json');
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('{}');
    jest.replaceProperty(Platform, 'OS', 'android');

    await saveToGoogleDrive('/mock/document/dir/FinTrack_AutoBackup_20260802.json');

    expect(SAF.requestDirectoryPermissionsAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('gdrive_backup_uri', 'content://drive/folder');
    expect(SAF.createFileAsync).toHaveBeenCalledWith('content://drive/folder', 'FinTrack_AutoBackup_20260802.json', 'application/json');
    expect(SAF.writeAsStringAsync).toHaveBeenCalledWith('content://drive/folder/backup.json', '{}');
  });

  it('tidak meminta izin ulang jika URI folder sudah tersimpan', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('content://drive/folder');
    (SAF.createFileAsync as jest.Mock).mockResolvedValue('content://drive/folder/backup.json');
    jest.replaceProperty(Platform, 'OS', 'android');

    await saveToGoogleDrive('/mock/document/dir/backup.json');

    expect(SAF.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
    expect(SAF.createFileAsync).toHaveBeenCalled();
  });

  it('tidak melakukan apa pun jika izin ditolak', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (SAF.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, directoryUri: null });
    jest.replaceProperty(Platform, 'OS', 'android');

    await saveToGoogleDrive('/mock/document/dir/backup.json');

    expect(SAF.createFileAsync).not.toHaveBeenCalled();
  });
});

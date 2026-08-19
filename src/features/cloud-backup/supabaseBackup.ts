import { SQLiteDatabase } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { getSupabase, BACKUP_BUCKET, isSupabaseConfigured } from '@/lib/supabase';
import { gatherBackupData, applyBackupData, LAST_BACKUP_DATE_KEY } from '@/features/export/backupRestore';
import { CLOUD_BACKUP_ENABLED_KEY, LAST_CLOUD_BACKUP_KEY } from '@/features/cloud-backup/constants';

export { CLOUD_BACKUP_ENABLED_KEY, LAST_CLOUD_BACKUP_KEY };
const MAX_KEPT = 10;

export interface CloudBackupItem {
  name: string;
  path: string;
  size: number;
  createdAt: string | null;
}

async function requireUserId(): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error('Kamu belum masuk. Silakan masuk terlebih dahulu.');
  return data.user.id;
}

export async function uploadBackup(db: SQLiteDatabase): Promise<string> {
  const userId = await requireUserId();
  const json = JSON.stringify(await gatherBackupData(db));
  const path = `${userId}/FinTrack_Backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;

  const { error } = await getSupabase().storage
    .from(BACKUP_BUCKET)
    .upload(path, json, { contentType: 'application/json', upsert: false });

  if (error) throw new Error(`Gagal mengunggah backup: ${error.message}`);

  const now = dayjs().format('YYYY-MM-DD');
  await AsyncStorage.setItem(LAST_CLOUD_BACKUP_KEY, now);
  await AsyncStorage.setItem(LAST_BACKUP_DATE_KEY, now);

  await pruneOldBackups().catch(() => {});
  return path;
}

export async function listBackups(): Promise<CloudBackupItem[]> {
  const userId = await requireUserId();

  const { data, error } = await getSupabase().storage
    .from(BACKUP_BUCKET)
    .list(userId, { limit: 100, sortBy: { column: 'name', order: 'desc' } });

  if (error) throw new Error(`Gagal memuat daftar backup: ${error.message}`);

  type StorageEntry = {
    id: string | null;
    name: string;
    created_at?: string | null;
    metadata?: { size?: number } | null;
  };

  return ((data ?? []) as StorageEntry[])
    .filter(f => f.id !== null && f.name.endsWith('.json'))
    .map(f => ({
      name: f.name,
      path: `${userId}/${f.name}`,
      size: f.metadata?.size ?? 0,
      createdAt: f.created_at ?? null,
    }));
}

export async function restoreBackup(db: SQLiteDatabase, path: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');

  // Use a signed URL + fetch instead of storage.download(): download() returns a
  // Blob, and React Native's Blob has no .text()/.arrayBuffer() implementation.
  const { data, error } = await getSupabase().storage
    .from(BACKUP_BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    throw new Error(`Gagal mengunduh backup: ${error?.message ?? 'URL tidak tersedia'}`);
  }

  const res = await fetch(data.signedUrl);
  if (!res.ok) throw new Error(`Gagal mengunduh backup (HTTP ${res.status})`);

  return applyBackupData(db, await res.text());
}

export async function deleteBackup(path: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await getSupabase().storage.from(BACKUP_BUCKET).remove([path]);
  if (error) throw new Error(`Gagal menghapus backup: ${error.message}`);
}

async function pruneOldBackups(): Promise<void> {
  const items = await listBackups();
  const stale = items.slice(MAX_KEPT).map(i => i.path);
  if (stale.length) await getSupabase().storage.from(BACKUP_BUCKET).remove(stale);
}

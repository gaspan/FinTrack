import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  /^https?:\/\//i.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project') &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'your-anon-key';

export const BACKUP_BUCKET = 'backups';

let client: SupabaseClient | null = null;

// Created lazily: createClient() runs GoTrueClient.initialize() during
// construction, which reads the persisted session from storage. Doing that at
// module scope competed with SQLiteProvider's fintrack.db migration during boot
// and hung release builds between the pin_read and db_init_start checkpoints.
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
      isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
      {
        auth: {
          // AsyncStorage is promise-based and never blocks the JS thread.
          // expo-sqlite's localStorage is synchronous and opens a second
          // SQLite database, and SecureStore truncates above ~2048 bytes.
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    );
  }
  return client;
}

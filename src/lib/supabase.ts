import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  /^https?:\/\//i.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project') &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'your-anon-key';

// createClient throws on an empty/malformed URL, which would crash the app at
// import time. Fall back to a syntactically valid placeholder so the app boots
// and the UI can show a "not configured" state instead.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const BACKUP_BUCKET = 'backups';

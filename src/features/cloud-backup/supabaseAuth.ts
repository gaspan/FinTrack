import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const EMAIL_DOMAIN = process.env.EXPO_PUBLIC_BACKUP_EMAIL_DOMAIN || 'fintrack.app';
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export class AuthError extends Error {}

export function validateUsername(username: string): string {
  const u = username.trim().toLowerCase();
  if (!u) throw new AuthError('Username wajib diisi');
  if (!USERNAME_RE.test(u)) {
    throw new AuthError('Username hanya boleh huruf, angka, dan _ (3-20 karakter)');
  }
  return u;
}

export function toEmail(username: string): string {
  return `${validateUsername(username)}@${EMAIL_DOMAIN}`;
}

export function usernameFromSession(session: Session | null): string | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata as { username?: string } | undefined;
  return meta?.username || session.user.email?.split('@')[0] || null;
}

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Username atau password salah';
  if (m.includes('user already registered')) return 'Username sudah terpakai';
  if (m.includes('password should be at least')) return 'Password minimal 6 karakter';
  if (m.includes('email address') && m.includes('invalid')) {
    return 'Username tidak dapat digunakan. Coba username lain.';
  }
  if (m.includes('email not confirmed')) {
    return 'Akun belum aktif. Matikan "Confirm email" di pengaturan Supabase.';
  }
  if (m.includes('over_email_send_rate_limit') || m.includes('rate limit')) {
    return 'Terlalu banyak percobaan. Coba lagi nanti.';
  }
  if (m.includes('network') || m.includes('fetch')) return 'Gagal terhubung. Periksa koneksi internet.';
  return message;
}

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new AuthError('Supabase belum dikonfigurasi. Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY di .env');
  }
}

export async function signUp(username: string, password: string): Promise<Session | null> {
  assertConfigured();
  const uname = validateUsername(username);
  if (password.length < 6) throw new AuthError('Password minimal 6 karakter');

  const { data, error } = await supabase.auth.signUp({
    email: toEmail(uname),
    password,
    options: { data: { username: uname } },
  });
  if (error) throw new AuthError(translate(error.message));
  return data.session;
}

export async function signIn(username: string, password: string): Promise<Session> {
  assertConfigured();
  if (!password) throw new AuthError('Password wajib diisi');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
  if (error) throw new AuthError(translate(error.message));
  return data.session;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

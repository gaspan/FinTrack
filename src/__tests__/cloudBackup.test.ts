import AsyncStorage from '@react-native-async-storage/async-storage';

const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
};

const mockBucket = {
  upload: jest.fn().mockResolvedValue({ error: null }),
  list: jest.fn().mockResolvedValue({ data: [], error: null }),
  remove: jest.fn().mockResolvedValue({ error: null }),
  createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed/url' }, error: null }),
};

jest.mock('@/lib/supabase', () => ({
  // Lazy getters: jest.mock is hoisted above the const declarations above, so
  // referencing mockAuth eagerly here would capture undefined.
  supabase: {
    get auth() { return mockAuth; },
    storage: { from: () => mockBucket },
  },
  BACKUP_BUCKET: 'backups',
  isSupabaseConfigured: true,
}));

import { toEmail, validateUsername, usernameFromSession, signIn, signUp, AuthError } from '@/features/cloud-backup/supabaseAuth';
import { uploadBackup, listBackups, restoreBackup, deleteBackup } from '@/features/cloud-backup/supabaseBackup';
import { applyBackupData } from '@/features/export/backupRestore';

const db = {
  getAllAsync: jest.fn().mockResolvedValue([]),
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
  withTransactionAsync: jest.fn().mockImplementation(async (fn: any) => fn()),
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
  mockBucket.upload.mockResolvedValue({ error: null });
  mockBucket.list.mockResolvedValue({ data: [], error: null });
  mockBucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/url' }, error: null });
});

describe('supabaseAuth username mapping', () => {
  it('memetakan username ke email sintetis dan huruf kecil', () => {
    expect(toEmail('Budi_123')).toBe('budi_123@fintrack.app');
  });

  it('menolak username tidak valid', () => {
    expect(() => validateUsername('ab')).toThrow(AuthError);
    expect(() => validateUsername('budi santoso')).toThrow(AuthError);
    expect(() => validateUsername('a'.repeat(21))).toThrow(AuthError);
    expect(() => validateUsername('')).toThrow(AuthError);
  });

  it('menerima username valid', () => {
    expect(validateUsername('Gentur_99')).toBe('gentur_99');
  });

  it('membaca username dari metadata sesi', () => {
    expect(usernameFromSession({ user: { user_metadata: { username: 'gentur' }, email: 'gentur@x.com' } } as any)).toBe('gentur');
    expect(usernameFromSession({ user: { user_metadata: {}, email: 'fallback@x.com' } } as any)).toBe('fallback');
    expect(usernameFromSession(null)).toBeNull();
  });

  it('menerjemahkan kredensial salah ke bahasa Indonesia', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } });
    await expect(signIn('gentur', 'wrongpass')).rejects.toThrow('Username atau password salah');
  });

  it('menolak password terlalu pendek saat daftar', async () => {
    await expect(signUp('gentur', '123')).rejects.toThrow('Password minimal 6 karakter');
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('mengirim username sebagai metadata saat daftar', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    await signUp('Gentur', 'secret123');
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'gentur@fintrack.app',
      password: 'secret123',
      options: { data: { username: 'gentur' } },
    });
  });
});

describe('supabaseBackup', () => {
  it('mengunggah backup ke folder milik user', async () => {
    const path = await uploadBackup(db);

    expect(path).toMatch(/^uid-1\/FinTrack_Backup_\d{8}_\d{6}\.json$/);
    const [usedPath, body, opts] = mockBucket.upload.mock.calls[0];
    expect(usedPath.startsWith('uid-1/')).toBe(true);
    expect(opts.contentType).toBe('application/json');
    expect(JSON.parse(body).version).toBe(4);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('last_cloud_backup_date', expect.any(String));
  });

  it('menolak unggah jika belum masuk', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(uploadBackup(db)).rejects.toThrow('Kamu belum masuk. Silakan masuk terlebih dahulu.');
    expect(mockBucket.upload).not.toHaveBeenCalled();
  });

  it('melempar error saat unggah gagal', async () => {
    mockBucket.upload.mockResolvedValue({ error: { message: 'quota exceeded' } });
    await expect(uploadBackup(db)).rejects.toThrow('Gagal mengunggah backup: quota exceeded');
  });

  it('mendaftar backup dan mengabaikan entri folder', async () => {
    mockBucket.list.mockResolvedValue({
      data: [
        { id: 'a', name: 'FinTrack_Backup_20260101_120000.json', metadata: { size: 2048 }, created_at: '2026-01-01' },
        { id: null, name: 'nested', metadata: null, created_at: null },
        { id: 'b', name: 'notes.txt', metadata: { size: 10 }, created_at: null },
      ],
      error: null,
    });

    const items = await listBackups();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      name: 'FinTrack_Backup_20260101_120000.json',
      path: 'uid-1/FinTrack_Backup_20260101_120000.json',
      size: 2048,
      createdAt: '2026-01-01',
    });
  });

  it('restore memakai signed URL lalu menerapkan data', async () => {
    const payload = {
      version: 4, exportedAt: '2026-01-01', wallets: [], categories: [],
      transactions: [], budgets: [], recurring_transactions: [],
    };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(payload) }) as any;

    const msg = await restoreBackup(db, 'uid-1/backup.json');

    expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('uid-1/backup.json', 60);
    expect(global.fetch).toHaveBeenCalledWith('https://signed/url');
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(msg).toContain('Berhasil mengembalikan');
  });

  it('restore gagal jika HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 }) as any;
    await expect(restoreBackup(db, 'uid-1/backup.json')).rejects.toThrow('Gagal mengunduh backup (HTTP 403)');
  });

  it('menghapus backup', async () => {
    await deleteBackup('uid-1/backup.json');
    expect(mockBucket.remove).toHaveBeenCalledWith(['uid-1/backup.json']);
  });
});

describe('applyBackupData', () => {
  it('menolak JSON rusak', async () => {
    await expect(applyBackupData(db, '{not json')).rejects.toThrow('Format file backup tidak valid');
  });

  it('menolak payload tanpa field wajib', async () => {
    await expect(applyBackupData(db, JSON.stringify({ version: 4 }))).rejects.toThrow('Format file backup tidak valid');
  });

  it('menerima objek yang sudah diparse', async () => {
    const msg = await applyBackupData(db, {
      version: 4, exportedAt: 'x', wallets: [{ id: 1, name: 'Cash', balance: 0 }],
      categories: [{ id: 1, name: 'Food', type: 'expense', icon: 'x', color: '#fff', sort_order: 0 }],
      transactions: [], budgets: [], recurring_transactions: [],
    } as any);
    expect(msg).toContain('1 kategori');
    expect(msg).toContain('1 dompet');
  });
});

describe('checkAndBackup dengan cloud', () => {
  const { checkAndBackup } = require('@/features/cloud-backup/backupScheduler');
  const FileSystem = require('expo-file-system/legacy');

  const enableAll = () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_backup_enabled') return Promise.resolve('true');
      if (key === 'cloud_backup_enabled') return Promise.resolve('true');
      return Promise.resolve(null);
    });
  };

  it('mengunggah ke cloud saat diaktifkan', async () => {
    enableAll();
    await checkAndBackup(db);
    expect(mockBucket.upload).toHaveBeenCalled();
  });

  it('backup lokal tetap tercatat walau unggah cloud gagal', async () => {
    enableAll();
    mockBucket.upload.mockResolvedValue({ error: { message: 'offline' } });

    await checkAndBackup(db);

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('last_auto_backup_date', expect.any(String));
  });

  it('tidak mengunggah ke cloud saat toggle nonaktif', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_backup_enabled') return Promise.resolve('true');
      if (key === 'cloud_backup_enabled') return Promise.resolve('false');
      return Promise.resolve(null);
    });

    await checkAndBackup(db);

    expect(mockBucket.upload).not.toHaveBeenCalled();
  });
});

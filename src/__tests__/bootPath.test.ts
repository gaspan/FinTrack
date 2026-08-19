/**
 * Regression guard for the boot hang between the pin_read and db_init_start
 * checkpoints: creating the Supabase client at module scope opened a second
 * SQLite database synchronously (via expo-sqlite's localStorage adapter) while
 * SQLiteProvider was migrating fintrack.db.
 *
 * These tests deliberately do NOT mock @/lib/supabase.
 */

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => {
    throw new Error('openDatabaseSync must not run during module evaluation');
  }),
  openDatabaseAsync: jest.fn(),
  useSQLiteContext: () => ({}),
}));

describe('boot path isolation', () => {
  it('importing lib/supabase does not construct a client or open SQLite', () => {
    const { openDatabaseSync } = require('expo-sqlite');
    expect(() => require('@/lib/supabase')).not.toThrow();
    expect(openDatabaseSync).not.toHaveBeenCalled();
  });

  it('backupScheduler does not pull in the supabase module graph', () => {
    // Measure only modules added by this require: require.cache is shared and
    // may already hold supabase entries loaded by other test files.
    const before = new Set(Object.keys(require.cache));
    require('@/features/cloud-backup/backupScheduler');
    const added = Object.keys(require.cache).filter(k => !before.has(k));

    expect(added.filter(k => k.includes('supabase'))).toEqual([]);
  });

  it('reading the cloud toggle key needs no supabase import', () => {
    const consts = require('@/features/cloud-backup/constants');
    expect(consts.CLOUD_BACKUP_ENABLED_KEY).toBe('cloud_backup_enabled');
  });
});

describe('boot diagnostic ack (key-aware)', () => {
  const { shouldShowBootDiagnostic, ackBootDiagnostic } = require('@/lib/bootLog');
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const state = new Map<string, string>();

  beforeEach(() => {
    state.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) => Promise.resolve(state.get(k) ?? null));
    (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => { state.set(k, v); return Promise.resolve(); });
  });

  it('shows once per distinct failing step', async () => {
    state.set('last_boot_step', 'db_init_start');
    expect(await shouldShowBootDiagnostic()).toBe('db_init_start');

    await ackBootDiagnostic('db_init_start');
    expect(await shouldShowBootDiagnostic()).toBeNull();

    state.set('last_boot_step', 'db_init_error: foo');
    expect(await shouldShowBootDiagnostic()).toBe('db_init_error: foo');
  });
});

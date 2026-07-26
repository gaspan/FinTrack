import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { DEFAULT_WALLETS } from '../constants/wallets';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2;

  let { user_version: currentDbVersion } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  ) ?? { user_version: 0 };

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          balance REAL NOT NULL DEFAULT 0,
          icon TEXT,
          color TEXT
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          amount REAL NOT NULL,
          category_id INTEGER NOT NULL,
          wallet_id INTEGER NOT NULL,
          transaction_date TEXT NOT NULL,
          notes TEXT,
          recurring_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          monthly_limit REAL NOT NULL,
          month TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          amount REAL NOT NULL,
          category_id INTEGER NOT NULL,
          wallet_id INTEGER NOT NULL,
          frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
          next_date TEXT NOT NULL,
          notes TEXT,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        );
      `);

      for (const cat of DEFAULT_CATEGORIES) {
        await db.runAsync(
          'INSERT INTO categories (name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)',
          [cat.name, cat.type, cat.icon, cat.color, cat.sort_order]
        );
      }

      for (const wallet of DEFAULT_WALLETS) {
        await db.runAsync(
          'INSERT INTO wallets (name, balance, icon, color) VALUES (?, ?, ?, ?)',
          [wallet.name, wallet.balance, wallet.icon, wallet.color]
        );
      }
    });

    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS savings_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          target_amount REAL NOT NULL,
          current_amount REAL NOT NULL DEFAULT 0,
          deadline TEXT,
          wallet_id INTEGER,
          icon TEXT DEFAULT 'flag-outline',
          color TEXT DEFAULT '#00D09C',
          is_completed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS bill_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          due_date TEXT NOT NULL,
          frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('one_time', 'monthly', 'yearly')),
          is_paid INTEGER DEFAULT 0,
          category_id INTEGER,
          wallet_id INTEGER,
          notes TEXT,
          calendar_event_id TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (wallet_id) REFERENCES wallets(id)
        );
      `);

      await db.execAsync(`ALTER TABLE wallets ADD COLUMN is_primary INTEGER DEFAULT 0;`);

      await db.execAsync(`CREATE TABLE IF NOT EXISTS app_lock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pin_hash TEXT,
        biometric_enabled INTEGER DEFAULT 0
      );`);
    });

    currentDbVersion = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

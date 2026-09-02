import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { DEFAULT_WALLETS } from '../constants/wallets';
import { bootCheckpoint } from '../lib/bootLog';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 9;

  // Wait for locks instead of aborting with "database is locked" when
  // concurrent queries race with a write transaction (expo-sqlite on Android).
  await db.execAsync('PRAGMA busy_timeout = 5000');
  // WAL allows reads to proceed while a writer holds the lock.
  await db.getFirstAsync('PRAGMA journal_mode = WAL');

  let { user_version: currentDbVersion } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  ) ?? { user_version: 0 };

  await db.execAsync(`PRAGMA foreign_keys = ON`);

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  await bootCheckpoint(`db_migrate_v${currentDbVersion}_start`);

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

  if (currentDbVersion === 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`ALTER TABLE transactions ADD COLUMN attachment_path TEXT;`);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transaction_attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          file_type TEXT DEFAULT 'image',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#6366f1',
          created_at TEXT DEFAULT (datetime('now')),
          book_id INTEGER NOT NULL DEFAULT 1,
          UNIQUE(name, book_id)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transaction_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
          UNIQUE(transaction_id, tag_id)
        );
      `);
    });

    currentDbVersion = 3;
  }

  if (currentDbVersion === 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('investment','property','other')),
          current_value REAL NOT NULL,
          initial_value REAL,
          purchase_date TEXT,
          notes TEXT,
          icon TEXT DEFAULT 'trending-up-outline',
          color TEXT DEFAULT '#6366F1',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS liabilities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('loan','credit_card','debt','other')),
          current_balance REAL NOT NULL,
          original_amount REAL,
          interest_rate REAL,
          monthly_payment REAL,
          due_date TEXT,
          notes TEXT,
          icon TEXT DEFAULT 'card-outline',
          color TEXT DEFAULT '#EF4444',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS net_worth_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          snapshot_date TEXT NOT NULL,
          total_assets REAL NOT NULL,
          total_liabilities REAL NOT NULL,
          net_worth REAL NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshot_month ON net_worth_snapshots(snapshot_date);
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL CHECK(category IN ('streaming','software','fitness','news','other')),
          amount REAL NOT NULL,
          billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly','yearly','quarterly')),
          start_date TEXT NOT NULL,
          next_billing_date TEXT NOT NULL,
          wallet_id INTEGER,
          category_id INTEGER,
          icon TEXT DEFAULT 'card-outline',
          color TEXT DEFAULT '#8B5CF6',
          is_active INTEGER DEFAULT 1,
          cancelled_date TEXT,
          auto_create INTEGER DEFAULT 1,
          remind INTEGER DEFAULT 1,
          calendar_event_id TEXT,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (wallet_id) REFERENCES wallets(id),
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_subs_active ON subscriptions(is_active);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_subs_next ON subscriptions(next_billing_date);
      `);
    });

    currentDbVersion = 4;
  }

  if (currentDbVersion === 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`ALTER TABLE budgets ADD COLUMN rollover_amount REAL DEFAULT 0;`);
      await db.execAsync(`ALTER TABLE budgets ADD COLUMN rollover_enabled INTEGER DEFAULT 0;`);
    });

    currentDbVersion = 5;
  }

  if (currentDbVersion === 5) {
    const hasColumn = async (table: string, column: string) => {
      const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      return cols.some(c => c.name === column);
    };

    await db.withTransactionAsync(async () => {
      if (!(await hasColumn('wallets', 'initial_balance'))) {
        await db.execAsync(`ALTER TABLE wallets ADD COLUMN initial_balance REAL DEFAULT 0;`);
      }

      const wallets = await db.getAllAsync<{ id: number; balance: number }>('SELECT id, balance FROM wallets');
      for (const w of wallets) {
        const { total } = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total FROM transactions WHERE wallet_id = ?`,
          [w.id]
        ) ?? { total: 0 };
        const initialBalance = Math.round((w.balance - total) * 100) / 100;
        await db.runAsync('UPDATE wallets SET initial_balance = ? WHERE id = ?', [initialBalance, w.id]);
      }

      if (!(await hasColumn('transactions', 'transfer_id'))) {
        await db.execAsync(`ALTER TABLE transactions ADD COLUMN transfer_id INTEGER;`);
      }

      const idxs = [
        ['idx_tx_date', 'transactions', 'transaction_date'],
        ['idx_tx_category', 'transactions', 'category_id'],
        ['idx_tx_wallet', 'transactions', 'wallet_id'],
        ['idx_tx_type', 'transactions', 'type'],
        ['idx_tx_transfer', 'transactions', 'transfer_id'],
        ['idx_tx_tags_tx', 'transaction_tags', 'transaction_id'],
        ['idx_tx_att_tx', 'transaction_attachments', 'transaction_id'],
        ['idx_budget_cat_mo', 'budgets', 'category_id, month'],
        ['idx_reminder_due', 'bill_reminders', 'due_date'],
        ['idx_recurring_act', 'recurring_transactions', 'is_active, next_date'],
      ] as const;
      for (const [name, table, cols] of idxs) {
        await db.execAsync(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${cols});`);
      }
    });

    currentDbVersion = 6;
  }

  if (currentDbVersion === 6) {
    const hasColumn = async (table: string, column: string) => {
      const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      return cols.some(c => c.name === column);
    };

    await db.withTransactionAsync(async () => {
      // Repair wallets whose initial_balance was never written on insert (pre-fix
      // wallets.tsx omitted the column), which reconcileWalletBalances would then
      // treat as a real 0 opening balance and wipe the saldo.
      const broken = await db.getAllAsync<{ id: number; balance: number }>(
        'SELECT id, balance FROM wallets WHERE COALESCE(initial_balance, 0) = 0 AND balance <> 0'
      );
      for (const w of broken) {
        const { total } = await db.getFirstAsync<{ total: number }>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as total
           FROM transactions WHERE wallet_id = ?`,
          [w.id]
        ) ?? { total: 0 };
        const initial = Math.round((w.balance - total) * 100) / 100;
        if (initial !== 0) {
          await db.runAsync('UPDATE wallets SET initial_balance = ? WHERE id = ?', [initial, w.id]);
        }
      }

      if (!(await hasColumn('bill_reminders', 'paid_transaction_id'))) {
        await db.execAsync(`ALTER TABLE bill_reminders ADD COLUMN paid_transaction_id INTEGER;`);
      }

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_name TEXT NOT NULL,
          direction TEXT NOT NULL CHECK(direction IN ('receivable', 'payable')),
          amount REAL NOT NULL,
          paid_amount REAL NOT NULL DEFAULT 0,
          due_date TEXT,
          wallet_id INTEGER,
          notes TEXT,
          is_settled INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (wallet_id) REFERENCES wallets (id)
        );

        CREATE TABLE IF NOT EXISTS debt_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debt_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL,
          transaction_id INTEGER,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_debts_settled ON debts(is_settled);
        CREATE INDEX IF NOT EXISTS idx_debt_pay_debt ON debt_payments(debt_id);
      `);
    });

    currentDbVersion = 7;
  }

  if (currentDbVersion === 7) {
    const hasColumn = async (table: string, column: string) => {
      const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      return cols.some(c => c.name === column);
    };

    const tagsDdl = (await db.getAllAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tags'"
    ))[0]?.sql ?? '';
    const needsTagsRebuild = tagsDdl.includes('UNIQUE') && !tagsDdl.toLowerCase().includes('book_id');
    if (needsTagsRebuild) {
      await db.execAsync('PRAGMA foreign_keys = OFF');
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE tags_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#6366f1',
            created_at TEXT DEFAULT (datetime('now')),
            book_id INTEGER NOT NULL DEFAULT 1,
            UNIQUE(name, book_id)
          );
        `);
        await db.execAsync(`
          INSERT INTO tags_new (id, name, color, created_at, book_id)
          SELECT id, name, color, created_at, 1 FROM tags;
        `);
        await db.execAsync('DROP TABLE tags;');
        await db.execAsync('ALTER TABLE tags_new RENAME TO tags;');
      });
      await db.execAsync('PRAGMA foreign_keys = ON');
    }

    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT 'book-outline',
          color TEXT DEFAULT '#6366F1',
          is_active INTEGER DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      const bookCount = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM books')
        ?? { c: 0 };
      if (bookCount.c === 0) {
        await db.runAsync(
          `INSERT INTO books (name, icon, color, sort_order) VALUES (?, ?, ?, ?)`,
          ['Pribadi', 'person-outline', '#6366F1', 1]
        );
      }

      const scopedTables: [string, string][] = [
        ['wallets', 'book_id'],
        ['categories', 'book_id'],
        ['transactions', 'book_id'],
        ['budgets', 'book_id'],
        ['recurring_transactions', 'book_id'],
        ['savings_goals', 'book_id'],
        ['bill_reminders', 'book_id'],
        ['debts', 'book_id'],
        ['debt_payments', 'book_id'],
        ['subscriptions', 'book_id'],
        ['assets', 'book_id'],
        ['liabilities', 'book_id'],
        ['net_worth_snapshots', 'book_id'],
        ['tags', 'book_id'],
        ['transaction_tags', 'book_id'],
        ['transaction_attachments', 'book_id'],
      ];

      for (const [table, column] of scopedTables) {
        if (!(await hasColumn(table, column))) {
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 1;`);
        }
      }

      const idxStmts = [
        ['idx_wallets_book', 'wallets'],
        ['idx_categories_book', 'categories'],
        ['idx_transactions_book', 'transactions'],
        ['idx_budgets_book', 'budgets'],
        ['idx_recurring_book', 'recurring_transactions'],
        ['idx_goals_book', 'savings_goals'],
        ['idx_bills_book', 'bill_reminders'],
        ['idx_debts_book', 'debts'],
        ['idx_debt_pay_book', 'debt_payments'],
        ['idx_subs_book', 'subscriptions'],
        ['idx_assets_book', 'assets'],
        ['idx_liab_book', 'liabilities'],
        ['idx_nw_snap_book', 'net_worth_snapshots'],
        ['idx_tags_book', 'tags'],
        ['idx_tx_tags_book', 'transaction_tags'],
        ['idx_tx_att_book', 'transaction_attachments'],
      ] as const;
      for (const [name, table] of idxStmts) {
        await db.execAsync(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(book_id);`);
      }
    });

    currentDbVersion = 8;
  }

  if (currentDbVersion === 8) {
    await db.withTransactionAsync(async () => {
      await db.execAsync('DROP INDEX IF EXISTS idx_snapshot_month;');
      await db.execAsync(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshot_month ON net_worth_snapshots(snapshot_date, book_id);'
      );
    });

    currentDbVersion = 9;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  await bootCheckpoint('db_migrate_done');
}

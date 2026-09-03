import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

export const LAST_BACKUP_DATE_KEY = 'last_backup_date';

const SETTINGS_KEYS = [
  'safe_to_spend_enabled', 'payroll_enabled', 'payroll_day', 'payroll_category_id',
  'app_pin_hash', 'app_biometric_enabled', 'auto_backup_enabled', 'backup_interval_days',
  'last_backup_date', 'last_auto_backup_date', 'onboarding_done',
  'notif_enabled', 'daily_reminder_enabled', 'daily_reminder_time', 'theme_preference',
  'active_book_id',
];

export interface BackupData {
  version: number;
  exportedAt: string;
  books?: any[];
  wallets: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  recurring_transactions: any[];
  savings_goals?: any[];
  goal_contributions?: any[];
  bill_reminders?: any[];
  assets?: any[];
  liabilities?: any[];
  net_worth_snapshots?: any[];
  subscriptions?: any[];
  tags?: any[];
  transaction_tags?: any[];
  transaction_attachments?: any[];
  debts?: any[];
  debt_payments?: any[];
  settings?: Record<string, string | null>;
}

export async function gatherBackupData(db: SQLiteDatabase): Promise<BackupData> {
  const [books, wallets, categories, transactions, budgets, recurring, goals, goalContributions, reminders, assets, liabilities, snapshots, subs, tags, tagLinks, attachments, debts, debtPayments] = await Promise.all([
    db.getAllAsync('SELECT * FROM books'),
    db.getAllAsync('SELECT * FROM wallets'),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM transactions'),
    db.getAllAsync('SELECT * FROM budgets'),
    db.getAllAsync('SELECT * FROM recurring_transactions'),
    db.getAllAsync('SELECT * FROM savings_goals'),
    db.getAllAsync('SELECT * FROM goal_contributions'),
    db.getAllAsync('SELECT * FROM bill_reminders'),
    db.getAllAsync('SELECT * FROM assets'),
    db.getAllAsync('SELECT * FROM liabilities'),
    db.getAllAsync('SELECT * FROM net_worth_snapshots'),
    db.getAllAsync('SELECT * FROM subscriptions'),
    db.getAllAsync('SELECT * FROM tags'),
    db.getAllAsync('SELECT * FROM transaction_tags'),
    db.getAllAsync('SELECT * FROM transaction_attachments'),
    db.getAllAsync('SELECT * FROM debts'),
    db.getAllAsync('SELECT * FROM debt_payments'),
  ]);

  const settings: Record<string, string | null> = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = await AsyncStorage.getItem(key);
  }

  return {
    version: 7,
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    books,
    wallets, categories, transactions, budgets,
    recurring_transactions: recurring,
    savings_goals: goals,
    goal_contributions: goalContributions,
    bill_reminders: reminders,
    assets, liabilities,
    net_worth_snapshots: snapshots,
    subscriptions: subs,
    tags, transaction_tags: tagLinks, transaction_attachments: attachments,
    debts, debt_payments: debtPayments,
    settings,
  };
}

export const exportBackup = async (db: SQLiteDatabase) => {
  const data = await gatherBackupData(db);

  const json = JSON.stringify(data, null, 2);
  const fileName = `FinTrack_Backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
  const filePath = FileSystem.documentDirectory + fileName;

  await FileSystem.writeAsStringAsync(filePath, json);
  await AsyncStorage.setItem(LAST_BACKUP_DATE_KEY, dayjs().format('YYYY-MM-DD'));

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Backup Data FinTrack',
    });
  }
};

export const performLocalBackup = async (db: SQLiteDatabase): Promise<string> => {
  const data = await gatherBackupData(db);

  const json = JSON.stringify(data);
  const fileName = `FinTrack_AutoBackup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
  const filePath = FileSystem.documentDirectory + fileName;

  await FileSystem.writeAsStringAsync(filePath, json);
  await AsyncStorage.setItem(LAST_BACKUP_DATE_KEY, dayjs().format('YYYY-MM-DD'));

  return filePath;
};

export const importBackup = async (db: SQLiteDatabase): Promise<string> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Pembatalan');
  }

  const fileUri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(fileUri);

  return applyBackupData(db, content);
};

export function validateBackupData(data: BackupData): void {
  if (!data?.version || !Array.isArray(data.transactions) || !Array.isArray(data.categories) || !Array.isArray(data.wallets)) {
    throw new Error('Format file backup tidak valid');
  }

  const books = data.books?.length
    ? data.books
    : [{ id: 1 }];
  const bookIds = new Set(books.map(book => Number(book.id)));
  if (bookIds.size !== books.length || [...bookIds].some(id => !Number.isInteger(id) || id <= 0)) {
    throw new Error('Backup memiliki pembukuan yang tidak valid');
  }

  const scopedRows: [string, any[] | undefined][] = [
    ['kategori', data.categories],
    ['dompet', data.wallets],
    ['transaksi', data.transactions],
    ['target', data.savings_goals],
    ['kontribusi target', data.goal_contributions],
    ['tagihan', data.bill_reminders],
    ['langganan', data.subscriptions],
    ['utang', data.debts],
    ['pembayaran utang', data.debt_payments],
    ['aset', data.assets],
    ['liabilitas', data.liabilities],
    ['snapshot', data.net_worth_snapshots],
    ['tag', data.tags],
    ['relasi tag', data.transaction_tags],
    ['lampiran', data.transaction_attachments],
  ];
  for (const [label, rows] of scopedRows) {
    for (const row of rows || []) {
      const rowBookId = Number(row.book_id ?? 1);
      if (!bookIds.has(rowBookId)) throw new Error(`${label} mengarah ke pembukuan yang tidak ada`);
    }
  }

  const walletIds = new Set((data.wallets || []).map(row => Number(row.id)));
  const categoryIds = new Set((data.categories || []).map(row => Number(row.id)));
  const transactionIds = new Set((data.transactions || []).map(row => Number(row.id)));
  const goalIds = new Set((data.savings_goals || []).map(row => Number(row.id)));
  const debtIds = new Set((data.debts || []).map(row => Number(row.id)));
  const tagIds = new Set((data.tags || []).map(row => Number(row.id)));

  for (const tx of data.transactions) {
    if (!walletIds.has(Number(tx.wallet_id)) || !categoryIds.has(Number(tx.category_id))) {
      throw new Error('Transaksi memiliki referensi wallet atau kategori yang tidak ada');
    }
  }
  for (const contribution of data.goal_contributions || []) {
    if (!goalIds.has(Number(contribution.goal_id)) || !walletIds.has(Number(contribution.wallet_id))) {
      throw new Error('Kontribusi target memiliki referensi yang tidak ada');
    }
    if (contribution.transaction_id != null && !transactionIds.has(Number(contribution.transaction_id))) {
      throw new Error('Kontribusi target memiliki transaksi yang tidak ada');
    }
  }
  for (const payment of data.debt_payments || []) {
    if (!debtIds.has(Number(payment.debt_id))) throw new Error('Pembayaran utang memiliki utang yang tidak ada');
  }
  for (const link of data.transaction_tags || []) {
    if (!transactionIds.has(Number(link.transaction_id)) || !tagIds.has(Number(link.tag_id))) {
      throw new Error('Relasi tag memiliki referensi yang tidak ada');
    }
  }
  for (const attachment of data.transaction_attachments || []) {
    if (!transactionIds.has(Number(attachment.transaction_id))) {
      throw new Error('Lampiran memiliki transaksi yang tidak ada');
    }
  }
}

export const applyBackupData = async (
  db: SQLiteDatabase,
  source: string | BackupData
): Promise<string> => {
  let data: BackupData;
  try {
    data = typeof source === 'string' ? JSON.parse(source) : source;
  } catch {
    throw new Error('Format file backup tidak valid');
  }

  validateBackupData(data);

  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM transaction_tags');
    await db.execAsync('DELETE FROM tags');
    await db.execAsync('DELETE FROM transaction_attachments');
    await db.execAsync('DELETE FROM goal_contributions');
    await db.execAsync('DELETE FROM debt_payments');
    await db.execAsync('DELETE FROM debts');
    await db.execAsync('DELETE FROM subscriptions');
    await db.execAsync('DELETE FROM net_worth_snapshots');
    await db.execAsync('DELETE FROM bill_reminders');
    await db.execAsync('DELETE FROM savings_goals');
    await db.execAsync('DELETE FROM transactions');
    await db.execAsync('DELETE FROM budgets');
    await db.execAsync('DELETE FROM recurring_transactions');
    await db.execAsync('DELETE FROM assets');
    await db.execAsync('DELETE FROM liabilities');
    await db.execAsync('DELETE FROM wallets');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM books');

    const booksToRestore = data.books?.length
      ? data.books
      : [{ id: 1, name: 'Pribadi', icon: 'book-outline', color: '#6366F1', is_active: 1, sort_order: 1, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') }];
    for (const b of booksToRestore) {
      await db.runAsync(
        'INSERT INTO books (id, name, icon, color, is_active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [b.id, b.name || 'Pembukuan', b.icon || 'book-outline', b.color || '#6366F1', b.is_active ?? 1, b.sort_order ?? b.id ?? 1, b.created_at ?? dayjs().format('YYYY-MM-DD HH:mm:ss')]
      );
    }

    for (const cat of data.categories) {
      await db.runAsync(
        'INSERT INTO categories (id, book_id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [cat.id, cat.book_id ?? 1, cat.name, cat.type, cat.icon, cat.color, cat.sort_order]
      );
    }
    for (const w of data.wallets) {
      await db.runAsync(
        'INSERT INTO wallets (id, book_id, name, balance, icon, color, is_primary, initial_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [w.id, w.book_id ?? 1, w.name, w.balance, w.icon, w.color, w.is_primary || 0, w.initial_balance || 0]
      );
    }
    for (const a of data.assets || []) {
      await db.runAsync(
        'INSERT INTO assets (id, book_id, name, type, current_value, initial_value, purchase_date, notes, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [a.id, a.book_id ?? 1, a.name, a.type, a.current_value, a.initial_value, a.purchase_date, a.notes, a.icon, a.color, a.created_at, a.updated_at]
      );
    }
    for (const l of data.liabilities || []) {
      await db.runAsync(
        'INSERT INTO liabilities (id, book_id, name, type, current_balance, original_amount, interest_rate, monthly_payment, due_date, notes, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [l.id, l.book_id ?? 1, l.name, l.type, l.current_balance, l.original_amount, l.interest_rate, l.monthly_payment, l.due_date, l.notes, l.icon, l.color, l.created_at, l.updated_at]
      );
    }
    for (const s of data.net_worth_snapshots || []) {
      await db.runAsync(
        'INSERT INTO net_worth_snapshots (id, book_id, snapshot_date, total_assets, total_liabilities, net_worth, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.book_id ?? 1, s.snapshot_date, s.total_assets, s.total_liabilities, s.net_worth, s.created_at]
      );
    }
    for (const s of data.subscriptions || []) {
      await db.runAsync(
        'INSERT INTO subscriptions (id, book_id, name, category, amount, billing_cycle, start_date, next_billing_date, wallet_id, category_id, icon, color, is_active, cancelled_date, auto_create, remind, calendar_event_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.book_id ?? 1, s.name, s.category, s.amount, s.billing_cycle, s.start_date, s.next_billing_date, s.wallet_id, s.category_id, s.icon, s.color, s.is_active, s.cancelled_date, s.auto_create, s.remind, s.calendar_event_id, s.notes, s.created_at, s.updated_at]
      );
    }
    for (const tx of data.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, book_id, type, amount, category_id, wallet_id, transaction_date, notes, recurring_id, transfer_id, is_internal, goal_contribution_id, source_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tx.id, tx.book_id ?? 1, tx.type, tx.amount, tx.category_id, tx.wallet_id, tx.transaction_date, tx.notes, tx.recurring_id, tx.transfer_id || null, tx.is_internal ?? 0, tx.goal_contribution_id ?? null, tx.source_key ?? null, tx.created_at]
      );
    }
    for (const b of data.budgets || []) {
      await db.runAsync(
        'INSERT INTO budgets (id, book_id, category_id, monthly_limit, month, rollover_amount, rollover_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [b.id, b.book_id ?? 1, b.category_id, b.monthly_limit, b.month, b.rollover_amount || 0, b.rollover_enabled || 0]
      );
    }
    for (const r of data.recurring_transactions || []) {
      await db.runAsync(
        'INSERT INTO recurring_transactions (id, book_id, type, amount, category_id, wallet_id, frequency, next_date, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.book_id ?? 1, r.type, r.amount, r.category_id, r.wallet_id, r.frequency, r.next_date, r.notes, r.is_active]
      );
    }
    for (const g of data.savings_goals || []) {
      await db.runAsync(
        'INSERT INTO savings_goals (id, book_id, name, target_amount, current_amount, deadline, wallet_id, icon, color, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [g.id, g.book_id ?? 1, g.name, g.target_amount, g.current_amount, g.deadline, g.wallet_id, g.icon, g.color, g.is_completed, g.created_at]
      );
    }
    for (const contribution of data.goal_contributions || []) {
      await db.runAsync(
        `INSERT INTO goal_contributions
          (id, book_id, goal_id, wallet_id, amount, contribution_date, transaction_id, kind, reversal_of_id, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contribution.id, contribution.book_id ?? 1, contribution.goal_id, contribution.wallet_id,
          contribution.amount, contribution.contribution_date, contribution.transaction_id ?? null,
          contribution.kind || 'contribution', contribution.reversal_of_id ?? null, contribution.notes ?? null,
          contribution.created_at]
      );
    }
    for (const r of data.bill_reminders || []) {
      await db.runAsync(
        'INSERT INTO bill_reminders (id, book_id, name, amount, due_date, frequency, is_paid, category_id, wallet_id, notes, calendar_event_id, paid_transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.book_id ?? 1, r.name, r.amount, r.due_date, r.frequency, r.is_paid, r.category_id, r.wallet_id, r.notes, r.calendar_event_id, r.paid_transaction_id ?? null, r.created_at]
      );
    }
    for (const d of data.debts || []) {
      await db.runAsync(
        'INSERT INTO debts (id, book_id, person_name, direction, amount, paid_amount, due_date, wallet_id, notes, is_settled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.id, d.book_id ?? 1, d.person_name, d.direction, d.amount, d.paid_amount || 0, d.due_date, d.wallet_id, d.notes, d.is_settled || 0, d.created_at, d.updated_at]
      );
    }
    for (const p of data.debt_payments || []) {
      await db.runAsync(
        'INSERT INTO debt_payments (id, book_id, debt_id, amount, payment_date, transaction_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.book_id ?? 1, p.debt_id, p.amount, p.payment_date, p.transaction_id, p.notes, p.created_at]
      );
    }
    for (const t of data.tags || []) {
      await db.runAsync(
        'INSERT INTO tags (id, book_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)',
        [t.id, t.book_id ?? 1, t.name, t.color, t.created_at]
      );
    }
    for (const tt of data.transaction_tags || []) {
      await db.runAsync(
        'INSERT INTO transaction_tags (id, book_id, transaction_id, tag_id) VALUES (?, ?, ?, ?)',
        [tt.id, tt.book_id ?? 1, tt.transaction_id, tt.tag_id]
      );
    }
    for (const att of data.transaction_attachments || []) {
      await db.runAsync(
        'INSERT INTO transaction_attachments (id, book_id, transaction_id, file_path, file_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [att.id, att.book_id ?? 1, att.transaction_id, att.file_path, att.file_type, att.created_at]
      );
    }
  });

  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      if (value !== null) await AsyncStorage.setItem(key, value);
    }
  }

  const count = data.transactions.length;
  return `Berhasil mengembalikan ${count} transaksi, ${data.categories.length} kategori, ${data.wallets.length} dompet.`;
};

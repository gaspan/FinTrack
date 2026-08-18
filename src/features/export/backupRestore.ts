import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

export const LAST_BACKUP_DATE_KEY = 'last_backup_date';

const SETTINGS_KEYS = [
  'safe_to_spend_enabled', 'payroll_enabled', 'payroll_day', 'payroll_category_id',
  'app_pin_hash', 'app_biometric_enabled', 'auto_backup_enabled', 'backup_interval',
  'last_backup_date', 'last_auto_backup_date', 'onboarding_done',
];

interface BackupData {
  version: number;
  exportedAt: string;
  wallets: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  recurring_transactions: any[];
  savings_goals?: any[];
  bill_reminders?: any[];
  assets?: any[];
  liabilities?: any[];
  net_worth_snapshots?: any[];
  subscriptions?: any[];
  tags?: any[];
  transaction_tags?: any[];
  transaction_attachments?: any[];
  settings?: Record<string, string | null>;
}

export async function gatherBackupData(db: SQLiteDatabase): Promise<BackupData> {
  const [wallets, categories, transactions, budgets, recurring, goals, reminders, assets, liabilities, snapshots, subs, tags, tagLinks, attachments] = await Promise.all([
    db.getAllAsync('SELECT * FROM wallets'),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM transactions'),
    db.getAllAsync('SELECT * FROM budgets'),
    db.getAllAsync('SELECT * FROM recurring_transactions'),
    db.getAllAsync('SELECT * FROM savings_goals'),
    db.getAllAsync('SELECT * FROM bill_reminders'),
    db.getAllAsync('SELECT * FROM assets'),
    db.getAllAsync('SELECT * FROM liabilities'),
    db.getAllAsync('SELECT * FROM net_worth_snapshots'),
    db.getAllAsync('SELECT * FROM subscriptions'),
    db.getAllAsync('SELECT * FROM tags'),
    db.getAllAsync('SELECT * FROM transaction_tags'),
    db.getAllAsync('SELECT * FROM transaction_attachments'),
  ]);

  const settings: Record<string, string | null> = {};
  for (const key of SETTINGS_KEYS) {
    settings[key] = await AsyncStorage.getItem(key);
  }

  return {
    version: 4,
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    wallets, categories, transactions, budgets,
    recurring_transactions: recurring,
    savings_goals: goals,
    bill_reminders: reminders,
    assets, liabilities,
    net_worth_snapshots: snapshots,
    subscriptions: subs,
    tags, transaction_tags: tagLinks, transaction_attachments: attachments,
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
  const data: BackupData = JSON.parse(content);

  if (!data.version || !data.transactions) {
    throw new Error('Format file backup tidak valid');
  }

  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM transaction_tags');
    await db.execAsync('DELETE FROM tags');
    await db.execAsync('DELETE FROM transaction_attachments');
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

    for (const cat of data.categories) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.sort_order]
      );
    }
    for (const w of data.wallets) {
      await db.runAsync(
        'INSERT INTO wallets (id, name, balance, icon, color, is_primary, initial_balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [w.id, w.name, w.balance, w.icon, w.color, w.is_primary || 0, w.initial_balance || 0]
      );
    }
    for (const a of data.assets || []) {
      await db.runAsync(
        'INSERT INTO assets (id, name, type, current_value, initial_value, purchase_date, notes, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [a.id, a.name, a.type, a.current_value, a.initial_value, a.purchase_date, a.notes, a.icon, a.color, a.created_at, a.updated_at]
      );
    }
    for (const l of data.liabilities || []) {
      await db.runAsync(
        'INSERT INTO liabilities (id, name, type, current_balance, original_amount, interest_rate, monthly_payment, due_date, notes, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [l.id, l.name, l.type, l.current_balance, l.original_amount, l.interest_rate, l.monthly_payment, l.due_date, l.notes, l.icon, l.color, l.created_at, l.updated_at]
      );
    }
    for (const s of data.net_worth_snapshots || []) {
      await db.runAsync(
        'INSERT INTO net_worth_snapshots (id, snapshot_date, total_assets, total_liabilities, net_worth, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [s.id, s.snapshot_date, s.total_assets, s.total_liabilities, s.net_worth, s.created_at]
      );
    }
    for (const s of data.subscriptions || []) {
      await db.runAsync(
        'INSERT INTO subscriptions (id, name, category, amount, billing_cycle, start_date, next_billing_date, wallet_id, category_id, icon, color, is_active, cancelled_date, auto_create, remind, calendar_event_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.name, s.category, s.amount, s.billing_cycle, s.start_date, s.next_billing_date, s.wallet_id, s.category_id, s.icon, s.color, s.is_active, s.cancelled_date, s.auto_create, s.remind, s.calendar_event_id, s.notes, s.created_at, s.updated_at]
      );
    }
    for (const tx of data.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, type, amount, category_id, wallet_id, transaction_date, notes, recurring_id, transfer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tx.id, tx.type, tx.amount, tx.category_id, tx.wallet_id, tx.transaction_date, tx.notes, tx.recurring_id, tx.transfer_id || null, tx.created_at]
      );
    }
    for (const b of data.budgets || []) {
      await db.runAsync(
        'INSERT INTO budgets (id, category_id, monthly_limit, month, rollover_amount, rollover_enabled) VALUES (?, ?, ?, ?, ?, ?)',
        [b.id, b.category_id, b.monthly_limit, b.month, b.rollover_amount || 0, b.rollover_enabled || 0]
      );
    }
    for (const r of data.recurring_transactions || []) {
      await db.runAsync(
        'INSERT INTO recurring_transactions (id, type, amount, category_id, wallet_id, frequency, next_date, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.type, r.amount, r.category_id, r.wallet_id, r.frequency, r.next_date, r.notes, r.is_active]
      );
    }
    for (const g of data.savings_goals || []) {
      await db.runAsync(
        'INSERT INTO savings_goals (id, name, target_amount, current_amount, deadline, wallet_id, icon, color, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [g.id, g.name, g.target_amount, g.current_amount, g.deadline, g.wallet_id, g.icon, g.color, g.is_completed, g.created_at]
      );
    }
    for (const r of data.bill_reminders || []) {
      await db.runAsync(
        'INSERT INTO bill_reminders (id, name, amount, due_date, frequency, is_paid, category_id, wallet_id, notes, calendar_event_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.amount, r.due_date, r.frequency, r.is_paid, r.category_id, r.wallet_id, r.notes, r.calendar_event_id, r.created_at]
      );
    }
    for (const t of data.tags || []) {
      await db.runAsync(
        'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [t.id, t.name, t.color, t.created_at]
      );
    }
    for (const tt of data.transaction_tags || []) {
      await db.runAsync(
        'INSERT INTO transaction_tags (id, transaction_id, tag_id) VALUES (?, ?, ?)',
        [tt.id, tt.transaction_id, tt.tag_id]
      );
    }
    for (const att of data.transaction_attachments || []) {
      await db.runAsync(
        'INSERT INTO transaction_attachments (id, transaction_id, file_path, file_type, created_at) VALUES (?, ?, ?, ?, ?)',
        [att.id, att.transaction_id, att.file_path, att.file_type, att.created_at]
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

import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import dayjs from 'dayjs';

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
}

export const exportBackup = async (db: SQLiteDatabase) => {
  const [wallets, categories, transactions, budgets, recurring, goals, reminders] = await Promise.all([
    db.getAllAsync('SELECT * FROM wallets'),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM transactions'),
    db.getAllAsync('SELECT * FROM budgets'),
    db.getAllAsync('SELECT * FROM recurring_transactions'),
    db.getAllAsync('SELECT * FROM savings_goals'),
    db.getAllAsync('SELECT * FROM bill_reminders'),
  ]);

  const data: BackupData = {
    version: 2,
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    wallets, categories, transactions, budgets,
    recurring_transactions: recurring,
    savings_goals: goals,
    bill_reminders: reminders,
  };

  const json = JSON.stringify(data, null, 2);
  const fileName = `FinTrack_Backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
  const filePath = FileSystem.documentDirectory + fileName;

  await FileSystem.writeAsStringAsync(filePath, json);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Backup Data FinTrack',
    });
  }
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
    await db.execAsync('DELETE FROM bill_reminders');
    await db.execAsync('DELETE FROM savings_goals');
    await db.execAsync('DELETE FROM transactions');
    await db.execAsync('DELETE FROM budgets');
    await db.execAsync('DELETE FROM recurring_transactions');
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
        'INSERT INTO wallets (id, name, balance, icon, color, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
        [w.id, w.name, w.balance, w.icon, w.color, w.is_primary || 0]
      );
    }
    for (const tx of data.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, type, amount, category_id, wallet_id, transaction_date, notes, recurring_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tx.id, tx.type, tx.amount, tx.category_id, tx.wallet_id, tx.transaction_date, tx.notes, tx.recurring_id, tx.created_at]
      );
    }
    for (const b of data.budgets || []) {
      await db.runAsync(
        'INSERT INTO budgets (id, category_id, monthly_limit, month) VALUES (?, ?, ?, ?)',
        [b.id, b.category_id, b.monthly_limit, b.month]
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
  });

  const count = data.transactions.length;
  return `Berhasil mengembalikan ${count} transaksi, ${data.categories.length} kategori, ${data.wallets.length} dompet.`;
};

import { SQLiteDatabase } from 'expo-sqlite';
import {
  Transaction,
  TransactionWithDetails,
  Category,
  Wallet,
  Budget,
  RecurringTransaction,
  TransactionType,
} from '@/types';

export class TransactionQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAllWithDetails(): Promise<TransactionWithDetails[]> {
    return this.db.getAllAsync<TransactionWithDetails>(`
      SELECT 
        t.*, 
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color, 
        w.name as wallet_name 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN wallets w ON t.wallet_id = w.id
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<TransactionWithDetails[]> {
    return this.db.getAllAsync<TransactionWithDetails>(`
      SELECT 
        t.*, 
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color, 
        w.name as wallet_name 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN wallets w ON t.wallet_id = w.id
      WHERE t.transaction_date >= ? AND t.transaction_date <= ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, [startDate, endDate]);
  }

  async create(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<number> {
    let newId = 0;
    await this.db.withTransactionAsync(async () => {
      const result = await this.db.runAsync(
        'INSERT INTO transactions (type, amount, category_id, wallet_id, transaction_date, notes, recurring_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tx.type, tx.amount, tx.category_id, tx.wallet_id, tx.transaction_date, tx.notes, tx.recurring_id]
      );
      newId = result.lastInsertRowId;

      // Update wallet balance
      const operator = tx.type === 'income' ? '+' : '-';
      await this.db.runAsync(
        `UPDATE wallets SET balance = balance ${operator} ? WHERE id = ?`,
        [tx.amount, tx.wallet_id]
      );
    });
    return newId;
  }

  async delete(id: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const tx = await this.db.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );
      if (tx) {
        // Reverse wallet balance
        const operator = tx.type === 'income' ? '-' : '+';
        await this.db.runAsync(
          `UPDATE wallets SET balance = balance ${operator} ? WHERE id = ?`,
          [tx.amount, tx.wallet_id]
        );
        await this.db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
      }
    });
  }
}

export class CategoryQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<Category[]> {
    return this.db.getAllAsync<Category>(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    );
  }

  async getByType(type: TransactionType): Promise<Category[]> {
    return this.db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC',
      [type]
    );
  }
}

export class WalletQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<Wallet[]> {
    return this.db.getAllAsync<Wallet>(
      'SELECT * FROM wallets ORDER BY id ASC'
    );
  }
}

export class ChartQueries {
  constructor(private db: SQLiteDatabase) {}

  async getCategoryBreakdown(startDate: string, endDate: string, type: TransactionType) {
    return this.db.getAllAsync<{ category_name: string, total: number, color: string }>(`
      SELECT 
        c.name as category_name, 
        SUM(t.amount) as total, 
        c.color 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
      GROUP BY c.id
      ORDER BY total DESC
    `, [type, startDate, endDate]);
  }

  async getSummary(startDate: string, endDate: string) {
    const income = await this.db.getFirstAsync<{ total: number }>(`
      SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND transaction_date >= ? AND transaction_date <= ?
    `, [startDate, endDate]);
    const expense = await this.db.getFirstAsync<{ total: number }>(`
      SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND transaction_date >= ? AND transaction_date <= ?
    `, [startDate, endDate]);

    return {
      totalIncome: income?.total || 0,
      totalExpense: expense?.total || 0,
    };
  }
}

export class BudgetQueries {
  constructor(private db: SQLiteDatabase) {}

  async getByMonth(month: string) {
    return this.db.getAllAsync<Budget & { category_name: string, spent: number, color: string }>(`
      SELECT 
        b.*, 
        c.name as category_name,
        c.color as color,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.transaction_date LIKE ? 
        AND t.type = 'expense'
      WHERE b.month = ?
      GROUP BY b.id
    `, [`${month}%`, month]);
  }

  async setBudget(categoryId: number, monthlyLimit: number, month: string) {
    const existing = await this.db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE category_id = ? AND month = ?',
      [categoryId, month]
    );

    if (existing) {
      await this.db.runAsync(
        'UPDATE budgets SET monthly_limit = ? WHERE id = ?',
        [monthlyLimit, existing.id]
      );
    } else {
      await this.db.runAsync(
        'INSERT INTO budgets (category_id, monthly_limit, month) VALUES (?, ?, ?)',
        [categoryId, monthlyLimit, month]
      );
    }
  }
}

export class RecurringQueries {
  constructor(private db: SQLiteDatabase) {}

  async getActive(): Promise<RecurringTransaction[]> {
    return this.db.getAllAsync<RecurringTransaction>(
      'SELECT * FROM recurring_transactions WHERE is_active = 1'
    );
  }
  
  async getAll(): Promise<(RecurringTransaction & { category_name: string, wallet_name: string })[]> {
    return this.db.getAllAsync<RecurringTransaction & { category_name: string, wallet_name: string }>(`
      SELECT r.*, c.name as category_name, w.name as wallet_name
      FROM recurring_transactions r
      JOIN categories c ON r.category_id = c.id
      JOIN wallets w ON r.wallet_id = w.id
      ORDER BY r.id DESC
    `);
  }

  async create(rt: Omit<RecurringTransaction, 'id' | 'is_active'>) {
    await this.db.runAsync(
      'INSERT INTO recurring_transactions (type, amount, category_id, wallet_id, frequency, next_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rt.type, rt.amount, rt.category_id, rt.wallet_id, rt.frequency, rt.next_date, rt.notes]
    );
  }
  
  async toggle(id: number, isActive: boolean) {
    await this.db.runAsync(
      'UPDATE recurring_transactions SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  }

  async updateNextDate(id: number, nextDate: string) {
    await this.db.runAsync(
      'UPDATE recurring_transactions SET next_date = ? WHERE id = ?',
      [nextDate, id]
    );
  }
}

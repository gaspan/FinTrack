import { SQLiteDatabase } from 'expo-sqlite';
import {
  Transaction,
  TransactionWithDetails,
  Category,
  Wallet,
  Budget,
  RecurringTransaction,
  TransactionType,
  SavingsGoal,
  BillReminder,
  MonthlyTrendPoint,
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

  async update(id: number, data: {
    type: TransactionType;
    amount: number;
    category_id: number;
    wallet_id: number;
    transaction_date: string;
    notes: string | null;
  }): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const oldTx = await this.db.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );
      if (!oldTx) return;

      const reverseOp = oldTx.type === 'income' ? '-' : '+';
      await this.db.runAsync(
        `UPDATE wallets SET balance = balance ${reverseOp} ? WHERE id = ?`,
        [oldTx.amount, oldTx.wallet_id]
      );

      const applyOp = data.type === 'income' ? '+' : '-';
      await this.db.runAsync(
        `UPDATE wallets SET balance = balance ${applyOp} ? WHERE id = ?`,
        [data.amount, data.wallet_id]
      );

      await this.db.runAsync(
        'UPDATE transactions SET type=?, amount=?, category_id=?, wallet_id=?, transaction_date=?, notes=? WHERE id=?',
        [data.type, data.amount, data.category_id, data.wallet_id, data.transaction_date, data.notes, id]
      );
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

  async create(data: { name: string; type: TransactionType; icon: string; color: string }) {
    const maxOrder = await this.db.getFirstAsync<{ max: number }>(
      'SELECT MAX(sort_order) as max FROM categories WHERE type = ?',
      [data.type]
    );
    const sortOrder = (maxOrder?.max || 0) + 1;
    await this.db.runAsync(
      'INSERT INTO categories (name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.type, data.icon, data.color, sortOrder]
    );
  }

  async update(id: number, data: { name: string; icon: string; color: string }) {
    await this.db.runAsync(
      'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
      [data.name, data.icon, data.color, id]
    );
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }
}

export class WalletQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<Wallet[]> {
    return this.db.getAllAsync<Wallet>(
      'SELECT * FROM wallets ORDER BY is_primary DESC, id ASC'
    );
  }

  async getPrimary(): Promise<Wallet | null> {
    return this.db.getFirstAsync<Wallet>(
      "SELECT * FROM wallets WHERE is_primary = 1 LIMIT 1"
    );
  }

  async setPrimary(id: number) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE wallets SET is_primary = 0');
      await this.db.runAsync('UPDATE wallets SET is_primary = 1 WHERE id = ?', [id]);
    });
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
  
  async delete(id: number) {
    await this.db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
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

export class SavingsGoalQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<SavingsGoal[]> {
    return this.db.getAllAsync<SavingsGoal>(
      'SELECT * FROM savings_goals ORDER BY is_completed ASC, deadline ASC'
    );
  }

  async create(data: { name: string; target_amount: number; deadline: string | null; wallet_id: number | null; icon: string; color: string }) {
    return this.db.runAsync(
      'INSERT INTO savings_goals (name, target_amount, deadline, wallet_id, icon, color) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.target_amount, data.deadline, data.wallet_id, data.icon, data.color]
    );
  }

  async update(id: number, data: Partial<{ name: string; target_amount: number; deadline: string | null; icon: string; color: string }>) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.target_amount !== undefined) { fields.push('target_amount = ?'); values.push(data.target_amount); }
    if (data.deadline !== undefined) { fields.push('deadline = ?'); values.push(data.deadline); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (fields.length === 0) return;
    values.push(id);
    await this.db.runAsync(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async addFunds(id: number, amount: number) {
    await this.db.runAsync(
      'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?',
      [amount, id]
    );
  }

  async markCompleted(id: number, completed: boolean) {
    await this.db.runAsync(
      'UPDATE savings_goals SET is_completed = ? WHERE id = ?',
      [completed ? 1 : 0, id]
    );
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
  }
}

export class BillReminderQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<(BillReminder & { category_name?: string; wallet_name?: string })[]> {
    return this.db.getAllAsync(`
      SELECT b.*, c.name as category_name, w.name as wallet_name
      FROM bill_reminders b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN wallets w ON b.wallet_id = w.id
      ORDER BY b.is_paid ASC, b.due_date ASC
    `);
  }

  async create(data: Omit<BillReminder, 'id' | 'created_at'>) {
    return this.db.runAsync(
      'INSERT INTO bill_reminders (name, amount, due_date, frequency, is_paid, category_id, wallet_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.amount, data.due_date, data.frequency, data.is_paid, data.category_id, data.wallet_id, data.notes]
    );
  }

  async update(id: number, data: Partial<Omit<BillReminder, 'id' | 'created_at'>> & { calendar_event_id?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
    if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date); }
    if (data.frequency !== undefined) { fields.push('frequency = ?'); values.push(data.frequency); }
    if (data.is_paid !== undefined) { fields.push('is_paid = ?'); values.push(data.is_paid ? 1 : 0); }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.wallet_id !== undefined) { fields.push('wallet_id = ?'); values.push(data.wallet_id); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
    if (data.calendar_event_id !== undefined) { fields.push('calendar_event_id = ?'); values.push(data.calendar_event_id); }
    if (fields.length === 0) return;
    values.push(id);
    await this.db.runAsync(`UPDATE bill_reminders SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM bill_reminders WHERE id = ?', [id]);
  }

  async togglePaid(id: number, isPaid: boolean) {
    await this.db.runAsync('UPDATE bill_reminders SET is_paid = ? WHERE id = ?', [isPaid ? 1 : 0, id]);
  }

  async updateCalendarEventId(id: number, eventId: string) {
    await this.db.runAsync('UPDATE bill_reminders SET calendar_event_id = ? WHERE id = ?', [eventId, id]);
  }
}

export class TrendQueries {
  constructor(private db: SQLiteDatabase) {}

  async getMonthlyTrend(months: number = 12): Promise<MonthlyTrendPoint[]> {
    return this.db.getAllAsync<MonthlyTrendPoint>(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= date('now', ?||' months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `, [`-${months}`]);
  }

  async getCashFlow(walletId?: number): Promise<{ month: string; flow: number }[]> {
    let whereClause = '';
    const params: any[] = [];
    if (walletId) {
      whereClause = 'AND wallet_id = ?';
      params.push(walletId);
    }
    return this.db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as flow
      FROM transactions
      WHERE transaction_date >= date('now', '-12 months') ${whereClause}
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `, params);
  }
}

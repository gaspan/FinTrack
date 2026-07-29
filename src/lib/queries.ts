import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
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
  Tag,
  TransactionAttachment,
  CategoryInsight,
  SpendingAlert,
  PaginatedResult,
  Asset,
  Liability,
  NetWorthSnapshot,
  Subscription,
} from '@/types';
import { CATEGORY_CLASSIFICATION } from '@/constants/categories';

export class TransactionQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAllWithDetails(): Promise<TransactionWithDetails[]> {
    const txs = await this.db.getAllAsync<TransactionWithDetails>(`
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

    const txIds = txs.map(t => t.id);
    if (txIds.length === 0) return txs;

    const tags = await this.db.getAllAsync<{ transaction_id: number; id: number; name: string; color: string; created_at: string }>(`
      SELECT tt.transaction_id, tg.id, tg.name, tg.color, tg.created_at
      FROM transaction_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
      WHERE tt.transaction_id IN (${txIds.join(',')})
    `);

    const tagsByTxId = tags.reduce((acc, t) => {
      if (!acc[t.transaction_id]) acc[t.transaction_id] = [];
      acc[t.transaction_id].push({ id: t.id, name: t.name, color: t.color, created_at: t.created_at });
      return acc;
    }, {} as Record<number, Tag[]>);

    const attachments = await this.db.getAllAsync<TransactionAttachment & { transaction_id: number }>(`
      SELECT * FROM transaction_attachments WHERE transaction_id IN (${txIds.join(',')})
    `);

    const attByTxId = attachments.reduce((acc, a) => {
      if (!acc[a.transaction_id]) acc[a.transaction_id] = [];
      acc[a.transaction_id].push(a);
      return acc;
    }, {} as Record<number, TransactionAttachment[]>);

    return txs.map(tx => ({
      ...tx,
      tags: tagsByTxId[tx.id] || [],
      attachments: attByTxId[tx.id] || [],
    }));
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

  async getAllPaginated(options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    type?: 'all' | 'income' | 'expense';
    categoryId?: number | null;
    walletId?: number | null;
    searchText?: string;
    tagIds?: number[];
  }): Promise<PaginatedResult<TransactionWithDetails>> {
    const { limit = 20, offset = 0, startDate, endDate, type, categoryId, walletId, searchText, tagIds } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate && endDate) {
      conditions.push('t.transaction_date >= ? AND t.transaction_date <= ?');
      params.push(startDate, endDate);
    }
    if (type && type !== 'all') {
      conditions.push('t.type = ?');
      params.push(type);
    }
    if (categoryId != null) {
      conditions.push('t.category_id = ?');
      params.push(categoryId);
    }
    if (walletId != null) {
      conditions.push('t.wallet_id = ?');
      params.push(walletId);
    }
    if (searchText?.trim()) {
      const q = `%${searchText.trim()}%`;
      conditions.push('(c.name LIKE ? OR w.name LIKE ? OR t.notes LIKE ? OR CAST(t.amount AS TEXT) LIKE ?)');
      params.push(q, q, q, q);
    }

    let tagJoin = '';
    if (tagIds && tagIds.length > 0) {
      tagJoin = 'JOIN transaction_tags tt ON t.id = tt.transaction_id';
      conditions.push(`tt.tag_id IN (${tagIds.map(() => '?').join(',')})`);
      params.push(...tagIds);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(DISTINCT t.id) as total FROM transactions t
       JOIN categories c ON t.category_id = c.id
       JOIN wallets w ON t.wallet_id = w.id
       ${tagJoin}
       ${whereClause}`,
      params
    );
    const total = countResult?.total || 0;

    const txs = await this.db.getAllAsync<TransactionWithDetails>(
      `SELECT DISTINCT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       JOIN wallets w ON t.wallet_id = w.id
       ${tagJoin}
       ${whereClause}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const txIds = txs.map(t => t.id);
    if (txIds.length > 0) {
      const tags = await this.db.getAllAsync<{ transaction_id: number; id: number; name: string; color: string; created_at: string }>(`
        SELECT tt.transaction_id, tg.id, tg.name, tg.color, tg.created_at
        FROM transaction_tags tt
        JOIN tags tg ON tt.tag_id = tg.id
        WHERE tt.transaction_id IN (${txIds.join(',')})
      `);

      const tagsByTxId = tags.reduce((acc, t) => {
        if (!acc[t.transaction_id]) acc[t.transaction_id] = [];
        acc[t.transaction_id].push({ id: t.id, name: t.name, color: t.color, created_at: t.created_at });
        return acc;
      }, {} as Record<number, Tag[]>);

      const attachments = await this.db.getAllAsync<TransactionAttachment & { transaction_id: number }>(`
        SELECT * FROM transaction_attachments WHERE transaction_id IN (${txIds.join(',')})
      `);

      const attByTxId = attachments.reduce((acc, a) => {
        if (!acc[a.transaction_id]) acc[a.transaction_id] = [];
        acc[a.transaction_id].push(a);
        return acc;
      }, {} as Record<number, TransactionAttachment[]>);

      return {
        data: txs.map(tx => ({
          ...tx,
          tags: tagsByTxId[tx.id] || [],
          attachments: attByTxId[tx.id] || [],
        })),
        total,
        hasMore: offset + limit < total,
      };
    }

    return { data: [], total: 0, hasMore: false };
  }

  async getAttachments(txId: number): Promise<TransactionAttachment[]> {
    return this.db.getAllAsync<TransactionAttachment>(
      'SELECT * FROM transaction_attachments WHERE transaction_id = ? ORDER BY created_at DESC',
      [txId]
    );
  }

  async addAttachment(txId: number, filePath: string, fileType: 'image' | 'document' = 'image') {
    await this.db.runAsync(
      'INSERT INTO transaction_attachments (transaction_id, file_path, file_type) VALUES (?, ?, ?)',
      [txId, filePath, fileType]
    );
  }

  async deleteAttachment(attachmentId: number) {
    await this.db.runAsync('DELETE FROM transaction_attachments WHERE id = ?', [attachmentId]);
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
        const operator = tx.type === 'income' ? '-' : '+';
        await this.db.runAsync(
          `UPDATE wallets SET balance = balance ${operator} ? WHERE id = ?`,
          [tx.amount, tx.wallet_id]
        );
        await this.db.runAsync('DELETE FROM transaction_tags WHERE transaction_id = ?', [id]);
        await this.db.runAsync('DELETE FROM transaction_attachments WHERE transaction_id = ?', [id]);
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

export class TagQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>('SELECT * FROM tags ORDER BY name ASC');
  }

  async search(query: string): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>(
      'SELECT * FROM tags WHERE name LIKE ? ORDER BY name ASC LIMIT 10',
      [`%${query}%`]
    );
  }

  async create(name: string, color?: string): Promise<Tag> {
    const result = await this.db.runAsync(
      'INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)',
      [name, color || '#6366f1']
    );
    if (result.changes === 0) {
      const existing = await this.db.getFirstAsync<Tag>('SELECT * FROM tags WHERE name = ?', [name]);
      return existing!;
    }
    return { id: result.lastInsertRowId, name, color: color || '#6366f1', created_at: new Date().toISOString() };
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
  }

  async getByTransaction(txId: number): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>(`
      SELECT tg.* FROM tags tg
      JOIN transaction_tags tt ON tg.id = tt.tag_id
      WHERE tt.transaction_id = ?
      ORDER BY tg.name ASC
    `, [txId]);
  }

  async addTagToTransaction(txId: number, tagId: number) {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
      [txId, tagId]
    );
  }

  async removeTagFromTransaction(txId: number, tagId: number) {
    await this.db.runAsync(
      'DELETE FROM transaction_tags WHERE transaction_id = ? AND tag_id = ?',
      [txId, tagId]
    );
  }

  async setTransactionTags(txId: number, tagIds: number[]) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM transaction_tags WHERE transaction_id = ?', [txId]);
      for (const tagId of tagIds) {
        await this.db.runAsync(
          'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
          [txId, tagId]
        );
      }
    });
  }
}

export class InsightQueries {
  constructor(private db: SQLiteDatabase) {}

  async getCategoryComparison(currentMonth: string, prevMonth: string): Promise<CategoryInsight[]> {
    const rows = await this.db.getAllAsync<any>(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.transaction_date) = ? THEN t.amount ELSE 0 END), 0) as current_total,
        COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.transaction_date) = ? THEN t.amount ELSE 0 END), 0) as prev_total
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'expense'
        AND (strftime('%Y-%m', t.transaction_date) = ? OR strftime('%Y-%m', t.transaction_date) = ?)
      WHERE c.type = 'expense'
      GROUP BY c.id
      HAVING current_total > 0 OR prev_total > 0
      ORDER BY current_total DESC
    `, [currentMonth, prevMonth, currentMonth, prevMonth]);

    return rows.map(r => {
      const delta = r.current_total - r.prev_total;
      const delta_percentage = r.prev_total === 0
        ? (r.current_total > 0 ? 100 : 0)
        : (delta / r.prev_total) * 100;
      const trend: 'up' | 'down' | 'stable' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable';
      return { ...r, delta, delta_percentage, trend };
    });
  }

  async getAnomalies(month: string, lookbackMonths: number = 3): Promise<SpendingAlert[]> {
    const startLookback = dayjs(month + '-01').subtract(lookbackMonths, 'month').format('YYYY-MM');

    const avgData = await this.db.getAllAsync<{
      category_id: number;
      category_name: string;
      avg_amount: number;
      current_amount: number;
    }>(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(AVG(CASE WHEN strftime('%Y-%m', t.transaction_date) >= ? AND strftime('%Y-%m', t.transaction_date) < ? THEN t.amount ELSE NULL END), 0) as avg_amount,
        COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.transaction_date) = ? THEN t.amount ELSE 0 END), 0) as current_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'expense'
      WHERE c.type = 'expense'
      GROUP BY c.id
      HAVING current_amount > avg_amount * 2 AND avg_amount > 0
    `, [startLookback, month, month]);

    return avgData.map(d => ({
      type: 'anomaly' as const,
      severity: (d.current_amount > d.avg_amount * 3 ? 'high' : d.current_amount > d.avg_amount * 2.5 ? 'medium' : 'low') as SpendingAlert['severity'],
      message: `Pengeluaran ${d.category_name} bulan ini ${Math.round(d.current_amount / d.avg_amount)}x lipat dari biasanya`,
      category_id: d.category_id,
      category_name: d.category_name,
      amount: d.current_amount,
    }));
  }

  async getDeficitAlerts(): Promise<SpendingAlert[]> {
    const monthlyFlow = await this.db.getAllAsync<{ month: string; flow: number }>(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as flow
      FROM transactions
      WHERE transaction_date >= date('now', '-5 months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `);

    const alerts: SpendingAlert[] = [];
    const deficitMonths = monthlyFlow.filter(m => m.flow < 0);

    if (deficitMonths.length >= 2) {
      alerts.push({
        type: 'deficit',
        severity: deficitMonths.length >= 3 ? 'high' : 'medium',
        message: `Defisit ${deficitMonths.length} bulan berturut-turut. Pertimbangkan untuk mengatur ulang anggaran.`,
        amount: Math.abs(deficitMonths.reduce((acc, m) => acc + m.flow, 0)),
      });
    }

    return alerts;
  }

  async getFinancialHealthData(): Promise<{
    monthlyIncome: number;
    monthlyExpense: number;
    totalBalance: number;
    avgMonthlyExpense: number;
    overBudgetCount: number;
    hasSavingsGoal: boolean;
    needsWantsBreakdown: { name: string; total: number; classification: string }[];
    topExpenseCategory: { name: string; total: number } | null;
  }> {
    const currentMonth = dayjs().format('YYYY-MM');
    const threeMosAgo = dayjs().subtract(3, 'month').format('YYYY-MM');

    const income = await this.db.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = 'income' AND strftime('%Y-%m', transaction_date) = ?
    `, [currentMonth]);

    const expense = await this.db.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = 'expense' AND strftime('%Y-%m', transaction_date) = ?
    `, [currentMonth]);

    const avgExpense = await this.db.getFirstAsync<{ avg: number; total: number }>(`
      SELECT COALESCE(SUM(amount), 0) / 3.0 as avg, COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = 'expense' AND strftime('%Y-%m', transaction_date) >= ?
    `, [threeMosAgo]);

    const balance = await this.db.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(balance), 0) as total FROM wallets
    `);

    const overBudget = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM budgets b
      WHERE b.month = ? AND b.monthly_limit < (
        SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
        WHERE t.category_id = b.category_id AND t.type = 'expense'
        AND strftime('%Y-%m', t.transaction_date) = b.month
      )
    `, [currentMonth]);

    const goal = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM savings_goals WHERE is_completed = 0
    `);

    const catBreakdown = await this.db.getAllAsync<{ name: string; total: number }>(`
      SELECT c.name, COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
      GROUP BY c.id
      ORDER BY total DESC
    `, [currentMonth]);

    const classification = catBreakdown.map(c => ({
      name: c.name,
      total: c.total,
      classification: (CATEGORY_CLASSIFICATION as Record<string, string>)[c.name] || 'wants',
    }));

    return {
      monthlyIncome: income?.total || 0,
      monthlyExpense: expense?.total || 0,
      totalBalance: balance?.total || 0,
      avgMonthlyExpense: avgExpense?.avg || 0,
      overBudgetCount: overBudget?.count || 0,
      hasSavingsGoal: (goal?.count || 0) > 0,
      needsWantsBreakdown: classification,
      topExpenseCategory: catBreakdown[0] || null,
    };
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

export class NetWorthQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAssets(): Promise<Asset[]> {
    return this.db.getAllAsync<Asset>('SELECT * FROM assets ORDER BY created_at DESC');
  }

  async getAssetById(id: number): Promise<Asset | null> {
    return this.db.getFirstAsync<Asset>('SELECT * FROM assets WHERE id = ?', [id]);
  }

  async addAsset(data: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO assets (name, type, current_value, initial_value, purchase_date, notes, icon, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, data.current_value, data.initial_value ?? null, data.purchase_date ?? null, data.notes ?? null, data.icon, data.color]
    );
    return result.lastInsertRowId;
  }

  async updateAsset(id: number, data: Partial<Omit<Asset, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }
    fields.push("updated_at = datetime('now')");
    params.push(id);
    await this.db.runAsync(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  async deleteAsset(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
  }

  async getLiabilities(): Promise<Liability[]> {
    return this.db.getAllAsync<Liability>('SELECT * FROM liabilities ORDER BY created_at DESC');
  }

  async getLiabilityById(id: number): Promise<Liability | null> {
    return this.db.getFirstAsync<Liability>('SELECT * FROM liabilities WHERE id = ?', [id]);
  }

  async addLiability(data: Omit<Liability, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO liabilities (name, type, current_balance, original_amount, interest_rate, monthly_payment, due_date, notes, icon, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, data.current_balance, data.original_amount ?? null, data.interest_rate ?? null, data.monthly_payment ?? null, data.due_date ?? null, data.notes ?? null, data.icon, data.color]
    );
    return result.lastInsertRowId;
  }

  async updateLiability(id: number, data: Partial<Omit<Liability, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }
    fields.push("updated_at = datetime('now')");
    params.push(id);
    await this.db.runAsync(`UPDATE liabilities SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  async deleteLiability(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM liabilities WHERE id = ?', [id]);
  }

  async getCurrentNetWorth(): Promise<{ totalAssets: number; totalLiabilities: number; netWorth: number }> {
    const walletSum = await this.db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(balance), 0) as total FROM wallets');
    const assetSum = await this.db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(current_value), 0) as total FROM assets');
    const liabilitySum = await this.db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(current_balance), 0) as total FROM liabilities');

    const totalAssets = (walletSum?.total ?? 0) + (assetSum?.total ?? 0);
    const totalLiabilities = liabilitySum?.total ?? 0;
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  }

  async getNetWorthHistory(months: number = 12): Promise<NetWorthSnapshot[]> {
    return this.db.getAllAsync<NetWorthSnapshot>(
      'SELECT * FROM net_worth_snapshots ORDER BY snapshot_date DESC LIMIT ?',
      [months]
    );
  }

  async ensureMonthlySnapshot(): Promise<void> {
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const existing = await this.db.getFirstAsync<NetWorthSnapshot>(
      'SELECT id FROM net_worth_snapshots WHERE snapshot_date = ?', [monthStart]
    );
    if (existing) return;

    const { totalAssets, totalLiabilities, netWorth } = await this.getCurrentNetWorth();
    await this.db.runAsync(
      'INSERT INTO net_worth_snapshots (snapshot_date, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?)',
      [monthStart, totalAssets, totalLiabilities, netWorth]
    );
  }
}

export class SubscriptionQueries {
  constructor(private db: SQLiteDatabase) {}

  async getAll(includeInactive?: boolean): Promise<Subscription[]> {
    const where = includeInactive ? '' : 'WHERE is_active = 1';
    return this.db.getAllAsync<Subscription>(`SELECT * FROM subscriptions ${where} ORDER BY name ASC`);
  }

  async getById(id: number): Promise<Subscription | null> {
    return this.db.getFirstAsync<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id]);
  }

  async getTotalMonthly(): Promise<number> {
    const rows = await this.db.getAllAsync<{ amount: number; billing_cycle: string }>(
      'SELECT amount, billing_cycle FROM subscriptions WHERE is_active = 1'
    );
    return rows.reduce((sum, r) => {
      const monthly = r.billing_cycle === 'yearly' ? r.amount / 12 : r.billing_cycle === 'quarterly' ? r.amount / 3 : r.amount;
      return sum + monthly;
    }, 0);
  }

  async getUpcomingRenewals(days: number): Promise<Subscription[]> {
    const until = dayjs().add(days, 'day').format('YYYY-MM-DD');
    return this.db.getAllAsync<Subscription>(
      'SELECT * FROM subscriptions WHERE is_active = 1 AND next_billing_date <= ? ORDER BY next_billing_date ASC',
      [until]
    );
  }

  async add(data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO subscriptions (name, category, amount, billing_cycle, start_date, next_billing_date, wallet_id, category_id, icon, color, is_active, auto_create, remind, calendar_event_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.category, data.amount, data.billing_cycle, data.start_date, data.next_billing_date,
       data.wallet_id ?? null, data.category_id ?? null, data.icon, data.color, data.is_active ?? 1,
       data.auto_create ?? 1, data.remind ?? 1, data.calendar_event_id ?? null, data.notes ?? null]
    );
    return result.lastInsertRowId;
  }

  async update(id: number, updates: Partial<Subscription>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && !['id', 'created_at', 'updated_at'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }
    fields.push("updated_at = datetime('now')");
    params.push(id);
    await this.db.runAsync(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  async cancel(id: number): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    await this.db.runAsync(
      "UPDATE subscriptions SET is_active = 0, cancelled_date = ?, updated_at = datetime('now') WHERE id = ?",
      [today, id]
    );
  }

  async processRenewals(): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const dueSubs = await this.db.getAllAsync<Subscription>(
      'SELECT * FROM subscriptions WHERE is_active = 1 AND next_billing_date <= ?',
      [today]
    );

    const txnQueries = new TransactionQueries(this.db);

    for (const sub of dueSubs) {
      if (sub.auto_create && sub.wallet_id && sub.category_id) {
        await txnQueries.create({
          type: 'expense',
          amount: sub.amount,
          category_id: sub.category_id,
          wallet_id: sub.wallet_id,
          transaction_date: today,
          notes: `Langganan ${sub.name}`,
          recurring_id: null,
        });
      }

      const nextDate = dayjs(sub.next_billing_date)
        .add(sub.billing_cycle === 'monthly' ? 1 : sub.billing_cycle === 'yearly' ? 12 : 3, 'month')
        .format('YYYY-MM-DD');

      await this.db.runAsync(
        "UPDATE subscriptions SET next_billing_date = ?, updated_at = datetime('now') WHERE id = ?",
        [nextDate, sub.id]
      );
    }
  }
}

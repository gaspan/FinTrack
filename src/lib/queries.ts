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
  Debt,
  DebtPayment,
  DebtSummary,
  DebtDirection,
  GoalContribution,
} from '@/types';
import { CATEGORY_CLASSIFICATION } from '@/constants/categories';

export type TransactionWrite = Omit<Transaction, 'id' | 'created_at' | 'book_id'>;

async function assertBookReference(
  db: SQLiteDatabase,
  table: 'wallets' | 'categories' | 'transactions' | 'savings_goals' | 'debts' | 'tags',
  id: number,
  bookId: number,
  label: string
): Promise<void> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM ${table} WHERE id = ? AND book_id = ? LIMIT 1`,
    [id, bookId]
  );
  if (!row) throw new Error(`${label} tidak ditemukan pada pembukuan aktif`);
}

export async function insertTransactionWithBalance(
  db: SQLiteDatabase,
  bookId: number,
  tx: TransactionWrite
): Promise<number> {
  await assertBookReference(db, 'wallets', tx.wallet_id, bookId, 'Dompet');
  await assertBookReference(db, 'categories', tx.category_id, bookId, 'Kategori');

  if (tx.source_key) {
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM transactions WHERE book_id = ? AND source_key = ? LIMIT 1',
      [bookId, tx.source_key]
    );
    if (existing) return existing.id;
  }

  const result = await db.runAsync(
    `INSERT INTO transactions
      (type, amount, category_id, wallet_id, transaction_date, notes, recurring_id,
       book_id, transfer_id, is_internal, goal_contribution_id, source_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.type,
      tx.amount,
      tx.category_id,
      tx.wallet_id,
      tx.transaction_date,
      tx.notes,
      tx.recurring_id,
      bookId,
      tx.transfer_id ?? null,
      tx.is_internal ?? 0,
      tx.goal_contribution_id ?? null,
      tx.source_key ?? null,
    ]
  );

  const operator = tx.type === 'income' ? '+' : '-';
  const walletUpdate = await db.runAsync(
    `UPDATE wallets SET balance = balance ${operator} ? WHERE id = ? AND book_id = ?`,
    [tx.amount, tx.wallet_id, bookId]
  );
  if (typeof walletUpdate?.changes === 'number' && walletUpdate.changes === 0) {
    throw new Error('Dompet tidak ditemukan pada pembukuan aktif');
  }

  return result.lastInsertRowId;
}

export async function deleteTransactionInTransaction(
  db: SQLiteDatabase,
  bookId: number,
  id: number
): Promise<void> {
  const tx = await db.getFirstAsync<Transaction>(
    'SELECT * FROM transactions WHERE id = ? AND book_id = ?',
    [id, bookId]
  );
  if (!tx) return;
  if (tx.goal_contribution_id) {
    throw new Error('Kontribusi target harus dibatalkan melalui histori target');
  }

  let rows = [tx];
  if (tx.transfer_id) {
    rows = await db.getAllAsync<Transaction>(
      'SELECT * FROM transactions WHERE transfer_id = ? AND book_id = ?',
      [tx.transfer_id, bookId]
    );
    if (rows.length !== 2) throw new Error('Pasangan transfer tidak lengkap');
  }

  for (const row of rows) {
    const reverseOperator = row.type === 'income' ? '-' : '+';
    await db.runAsync(
      `UPDATE wallets SET balance = balance ${reverseOperator} ? WHERE id = ? AND book_id = ?`,
      [row.amount, row.wallet_id, bookId]
    );
    await db.runAsync(
      'DELETE FROM transaction_tags WHERE transaction_id = ? AND book_id = ?',
      [row.id, bookId]
    );
    await db.runAsync(
      'DELETE FROM transaction_attachments WHERE transaction_id = ? AND book_id = ?',
      [row.id, bookId]
    );
    await db.runAsync('DELETE FROM transactions WHERE id = ? AND book_id = ?', [row.id, bookId]);
  }
}

export class TransactionQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAllWithDetails(): Promise<TransactionWithDetails[]> {
    const txs = await this.db.getAllAsync<TransactionWithDetails>(`
      SELECT 
        t.*, 
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color, 
        w.name as wallet_name 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
      JOIN wallets w ON t.wallet_id = w.id AND w.book_id = t.book_id
      WHERE t.book_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, [this.bookId]);

    const txIds = txs.map(t => t.id);
    if (txIds.length === 0) return txs;

    const tags = await this.db.getAllAsync<{ transaction_id: number; id: number; name: string; color: string; created_at: string }>(`
      SELECT tt.transaction_id, tg.id, tg.name, tg.color, tg.created_at
      FROM transaction_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
      WHERE tt.transaction_id IN (${txIds.join(',')}) AND tt.book_id = ? AND tg.book_id = ?
    `, [this.bookId, this.bookId]);

    const tagsByTxId = tags.reduce((acc, t) => {
      if (!acc[t.transaction_id]) acc[t.transaction_id] = [];
      acc[t.transaction_id].push({ id: t.id, name: t.name, color: t.color, created_at: t.created_at });
      return acc;
    }, {} as Record<number, Tag[]>);

    const attachments = await this.db.getAllAsync<TransactionAttachment & { transaction_id: number }>(`
      SELECT * FROM transaction_attachments
      WHERE transaction_id IN (${txIds.join(',')}) AND book_id = ?
    `, [this.bookId]);

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

  async getByDateRange(startDate: string, endDate: string, includeInternal = true): Promise<TransactionWithDetails[]> {
    const internalClause = includeInternal ? '' : ' AND t.is_internal = 0';
    return this.db.getAllAsync<TransactionWithDetails>(`
      SELECT 
        t.*, 
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color, 
        w.name as wallet_name 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
      JOIN wallets w ON t.wallet_id = w.id AND w.book_id = t.book_id
      WHERE t.book_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ? AND t.transfer_id IS NULL${internalClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, [this.bookId, startDate, endDate]);
  }

  async getByIdWithDetails(id: number): Promise<TransactionWithDetails | null> {
    return this.db.getFirstAsync<TransactionWithDetails>(`
      SELECT
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        w.name as wallet_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
      JOIN wallets w ON t.wallet_id = w.id AND w.book_id = t.book_id
      WHERE t.id = ? AND t.book_id = ?
    `, [id, this.bookId]);
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

    const conditions: string[] = ['t.book_id = ?'];
    const params: any[] = [this.bookId];

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
      tagJoin = 'JOIN transaction_tags tt ON t.id = tt.transaction_id AND tt.book_id = t.book_id';
      conditions.push(`tt.tag_id IN (${tagIds.map(() => '?').join(',')})`);
      params.push(...tagIds);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(DISTINCT t.id) as total FROM transactions t
       JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
       JOIN wallets w ON t.wallet_id = w.id AND w.book_id = t.book_id
       ${tagJoin}
       ${whereClause}`,
      params
    );
    const total = countResult?.total || 0;

    const txs = await this.db.getAllAsync<TransactionWithDetails>(
      `SELECT DISTINCT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
       JOIN wallets w ON t.wallet_id = w.id AND w.book_id = t.book_id
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
        WHERE tt.transaction_id IN (${txIds.join(',')}) AND tt.book_id = ? AND tg.book_id = ?
      `, [this.bookId, this.bookId]);

      const tagsByTxId = tags.reduce((acc, t) => {
        if (!acc[t.transaction_id]) acc[t.transaction_id] = [];
        acc[t.transaction_id].push({ id: t.id, name: t.name, color: t.color, created_at: t.created_at });
        return acc;
      }, {} as Record<number, Tag[]>);

      const attachments = await this.db.getAllAsync<TransactionAttachment & { transaction_id: number }>(`
        SELECT * FROM transaction_attachments
        WHERE transaction_id IN (${txIds.join(',')}) AND book_id = ?
      `, [this.bookId]);

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
      `SELECT a.* FROM transaction_attachments a
       JOIN transactions t ON t.id = a.transaction_id AND t.book_id = a.book_id
       WHERE a.transaction_id = ? AND a.book_id = ? ORDER BY a.created_at DESC`,
      [txId, this.bookId]
    );
  }

  async addAttachment(txId: number, filePath: string, fileType: 'image' | 'document' = 'image') {
    await assertBookReference(this.db, 'transactions', txId, this.bookId, 'Transaksi');
    await this.db.runAsync(
      'INSERT INTO transaction_attachments (transaction_id, file_path, file_type, book_id) VALUES (?, ?, ?, ?)',
      [txId, filePath, fileType, this.bookId]
    );
  }

  async deleteAttachment(attachmentId: number) {
    await this.db.runAsync(
      'DELETE FROM transaction_attachments WHERE id = ? AND book_id = ?',
      [attachmentId, this.bookId]
    );
  }

  async create(tx: TransactionWrite): Promise<number> {
    let newId = 0;
    await this.db.withTransactionAsync(async () => {
      newId = await insertTransactionWithBalance(this.db, this.bookId, tx);
    });
    return newId;
  }

  async delete(id: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await deleteTransactionInTransaction(this.db, this.bookId, id);
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
        'SELECT * FROM transactions WHERE id = ? AND book_id = ?',
        [id, this.bookId]
      );
      if (!oldTx) return;
      if (oldTx.transfer_id) throw new Error('Transfer harus diedit sebagai pasangan');
      if (oldTx.goal_contribution_id) throw new Error('Kontribusi target tidak dapat diedit langsung');

      await assertBookReference(this.db, 'wallets', data.wallet_id, this.bookId, 'Dompet');
      await assertBookReference(this.db, 'categories', data.category_id, this.bookId, 'Kategori');

      const reverseOp = oldTx.type === 'income' ? '-' : '+';
      await this.db.runAsync(
        `UPDATE wallets SET balance = balance ${reverseOp} ? WHERE id = ? AND book_id = ?`,
        [oldTx.amount, oldTx.wallet_id, this.bookId]
      );

      const applyOp = data.type === 'income' ? '+' : '-';
      await this.db.runAsync(
        `UPDATE wallets SET balance = balance ${applyOp} ? WHERE id = ? AND book_id = ?`,
        [data.amount, data.wallet_id, this.bookId]
      );

      await this.db.runAsync(
        'UPDATE transactions SET type=?, amount=?, category_id=?, wallet_id=?, transaction_date=?, notes=? WHERE id=? AND book_id=?',
        [data.type, data.amount, data.category_id, data.wallet_id, data.transaction_date, data.notes, id, this.bookId]
      );
    });
  }
}

export class CategoryQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(): Promise<Category[]> {
    return this.db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE book_id = ? ORDER BY sort_order ASC',
      [this.bookId]
    );
  }

  async getByType(type: TransactionType): Promise<Category[]> {
    return this.db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE book_id = ? AND type = ? ORDER BY sort_order ASC',
      [this.bookId, type]
    );
  }

  async create(data: { name: string; type: TransactionType; icon: string; color: string }) {
    const maxOrder = await this.db.getFirstAsync<{ max: number }>(
      'SELECT MAX(sort_order) as max FROM categories WHERE book_id = ? AND type = ?',
      [this.bookId, data.type]
    );
    const sortOrder = (maxOrder?.max || 0) + 1;
    await this.db.runAsync(
      'INSERT INTO categories (name, type, icon, color, sort_order, book_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.type, data.icon, data.color, sortOrder, this.bookId]
    );
  }

  async update(id: number, data: { name: string; icon: string; color: string }) {
    await this.db.runAsync(
      'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ? AND book_id = ?',
      [data.name, data.icon, data.color, id, this.bookId]
    );
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM categories WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }
}

export class WalletQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(): Promise<Wallet[]> {
    return this.db.getAllAsync<Wallet>(
      'SELECT * FROM wallets WHERE book_id = ? ORDER BY is_primary DESC, id ASC',
      [this.bookId]
    );
  }

  async getPrimary(): Promise<Wallet | null> {
    return this.db.getFirstAsync<Wallet>(
      'SELECT * FROM wallets WHERE book_id = ? AND is_primary = 1 LIMIT 1',
      [this.bookId]
    );
  }

  async setPrimary(id: number) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE wallets SET is_primary = 0 WHERE book_id = ?', [this.bookId]);
      await this.db.runAsync('UPDATE wallets SET is_primary = 1 WHERE id = ? AND book_id = ?', [id, this.bookId]);
    });
  }

  async create(data: { name: string; balance: number; icon: string; color: string }): Promise<number> {
    // initial_balance must mirror the opening balance: reconcileWalletBalances
    // recomputes balance as initial_balance + sum(transactions), so leaving it at
    // 0 would silently wipe the saldo on the next app launch.
    const res = await this.db.runAsync(
      'INSERT INTO wallets (name, balance, initial_balance, icon, color, book_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.balance, data.balance, data.icon, data.color, this.bookId]
    );
    return res.lastInsertRowId;
  }

  async update(id: number, data: { name: string; balance: number; icon: string; color: string }) {
    // Editing the opening balance shifts the current balance by the same delta so
    // recorded transactions stay intact.
    const current = await this.db.getFirstAsync<{ balance: number; initial_balance: number }>(
      'SELECT balance, COALESCE(initial_balance, 0) as initial_balance FROM wallets WHERE id = ? AND book_id = ?',
      [id, this.bookId]
    );
    if (!current) return;

    const delta = data.balance - current.initial_balance;
    await this.db.runAsync(
      'UPDATE wallets SET name = ?, icon = ?, color = ?, initial_balance = ?, balance = ? WHERE id = ? AND book_id = ?',
      [data.name, data.icon, data.color, data.balance, Math.round((current.balance + delta) * 100) / 100, id, this.bookId]
    );
  }

  async countTransactions(id: number): Promise<number> {
    const row = await this.db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM transactions WHERE book_id = ? AND wallet_id = ?',
      [this.bookId, id]
    );
    return row?.c ?? 0;
  }

  async delete(id: number) {
    await this.db.withTransactionAsync(async () => {
      const wasPrimary = await this.db.getFirstAsync<{ is_primary: number }>(
        'SELECT is_primary FROM wallets WHERE id = ? AND book_id = ?',
        [id, this.bookId]
      );
      const txCount = await this.countTransactions(id);
      if (txCount > 0) throw new Error('Dompet yang memiliki transaksi tidak dapat dihapus');
      await this.db.runAsync('DELETE FROM wallets WHERE id = ? AND book_id = ?', [id, this.bookId]);
      if (wasPrimary?.is_primary) {
        const next = await this.db.getFirstAsync<{ id: number }>('SELECT id FROM wallets WHERE book_id = ? ORDER BY id ASC LIMIT 1', [this.bookId]);
        if (next) await this.db.runAsync('UPDATE wallets SET is_primary = 1 WHERE id = ? AND book_id = ?', [next.id, this.bookId]);
      }
    });
  }
}

export class TransferQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async createTransfer(data: {
    sourceWalletId: number;
    targetWalletId: number;
    amount: number;
    date: string;
    notes?: string | null;
  }): Promise<number> {
    if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('Nominal transfer tidak valid');
    if (data.sourceWalletId === data.targetWalletId) throw new Error('Dompet asal dan tujuan harus berbeda');

    await assertBookReference(this.db, 'wallets', data.sourceWalletId, this.bookId, 'Dompet asal');
    await assertBookReference(this.db, 'wallets', data.targetWalletId, this.bookId, 'Dompet tujuan');

    const sourceTarget = await resolveBookingTarget(this.db, 'expense', data.sourceWalletId, null, this.bookId);
    const targetTarget = await resolveBookingTarget(this.db, 'income', data.targetWalletId, null, this.bookId);
    if (!sourceTarget || !targetTarget) throw new Error('Kategori transfer tidak tersedia');

    let transferId = 0;
    await this.db.withTransactionAsync(async () => {
      const sourceId = await insertTransactionWithBalance(this.db, this.bookId, {
        type: 'expense',
        amount: data.amount,
        category_id: sourceTarget.categoryId,
        wallet_id: data.sourceWalletId,
        transaction_date: data.date,
        notes: data.notes ? `Transfer: ${data.notes}` : 'Transfer antar dompet',
        recurring_id: null,
        transfer_id: null,
      });
      transferId = sourceId;
      await this.db.runAsync(
        'UPDATE transactions SET transfer_id = ? WHERE id = ? AND book_id = ?',
        [transferId, sourceId, this.bookId]
      );
      await insertTransactionWithBalance(this.db, this.bookId, {
        type: 'income',
        amount: data.amount,
        category_id: targetTarget.categoryId,
        wallet_id: data.targetWalletId,
        transaction_date: data.date,
        notes: data.notes ? `Transfer: ${data.notes}` : 'Transfer antar dompet',
        recurring_id: null,
        transfer_id: transferId,
      });
    });
    return transferId;
  }

  async getPair(transferId: number): Promise<Transaction[]> {
    return this.db.getAllAsync<Transaction>(
      'SELECT * FROM transactions WHERE transfer_id = ? AND book_id = ? ORDER BY type ASC, id ASC',
      [transferId, this.bookId]
    );
  }

  async updateTransfer(transferId: number, data: { amount: number; date: string; notes?: string | null }) {
    if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('Nominal transfer tidak valid');
    const pair = await this.getPair(transferId);
    if (pair.length !== 2) throw new Error('Pasangan transfer tidak lengkap');

    const expense = pair.find(tx => tx.type === 'expense');
    const income = pair.find(tx => tx.type === 'income');
    if (!expense || !income || expense.wallet_id === income.wallet_id) {
      throw new Error('Pasangan transfer tidak valid');
    }

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE wallets SET balance = balance + ? WHERE id = ? AND book_id = ?',
        [expense.amount, expense.wallet_id, this.bookId]
      );
      await this.db.runAsync(
        'UPDATE wallets SET balance = balance - ? WHERE id = ? AND book_id = ?',
        [income.amount, income.wallet_id, this.bookId]
      );
      await this.db.runAsync(
        'UPDATE wallets SET balance = balance - ? WHERE id = ? AND book_id = ?',
        [data.amount, expense.wallet_id, this.bookId]
      );
      await this.db.runAsync(
        'UPDATE wallets SET balance = balance + ? WHERE id = ? AND book_id = ?',
        [data.amount, income.wallet_id, this.bookId]
      );
      const note = data.notes ? `Transfer: ${data.notes}` : 'Transfer antar dompet';
      await this.db.runAsync(
        'UPDATE transactions SET amount = ?, transaction_date = ?, notes = ? WHERE id = ? AND book_id = ?',
        [data.amount, data.date, note, expense.id, this.bookId]
      );
      await this.db.runAsync(
        'UPDATE transactions SET amount = ?, transaction_date = ?, notes = ? WHERE id = ? AND book_id = ?',
        [data.amount, data.date, note, income.id, this.bookId]
      );
    });
  }

  async deleteTransfer(transferId: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const pair = await this.getPair(transferId);
      if (pair.length !== 2) throw new Error('Pasangan transfer tidak lengkap');
      await deleteTransactionInTransaction(this.db, this.bookId, pair[0].id);
    });
  }
}

/**
 * Resolves the wallet/category a background engine should book against when the
 * source record has none (legacy subscriptions, bills without a wallet, ...).
 * Mirrors the "Lainnya" fallback already used by transfer.tsx.
 */
export async function resolveBookingTarget(
  db: SQLiteDatabase,
  type: TransactionType,
  walletId?: number | null,
  categoryId?: number | null,
  bookId = 1
): Promise<{ walletId: number; categoryId: number } | null> {
  let wallet = walletId ?? null;
  if (!wallet) {
    const w = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM wallets WHERE book_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1',
      [bookId]
    );
    wallet = w?.id ?? null;
  }
  if (!wallet) return null;

  let category = categoryId ?? null;
  if (!category) {
    const c = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE book_id = ? AND type = ? AND name = ? LIMIT 1',
      [bookId, type, 'Lainnya']
    );
    if (c) {
      category = c.id;
    } else {
      const fallback = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM categories WHERE book_id = ? AND type = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
        [bookId, type]
      );
      if (fallback) {
        category = fallback.id;
      } else {
        const created = await db.runAsync(
          'INSERT INTO categories (name, type, icon, color, sort_order, book_id) VALUES (?, ?, ?, ?, ?, ?)',
          ['Lainnya', type, 'ellipsis-horizontal-outline', '#9CA3AF', 99, bookId]
        );
        category = created.lastInsertRowId;
      }
    }
  }

  return { walletId: wallet, categoryId: category };
}

export class ChartQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getCategoryBreakdown(startDate: string, endDate: string, type: TransactionType) {
    return this.db.getAllAsync<{ category_name: string, total: number, color: string }>(`
      SELECT 
        c.name as category_name, 
        SUM(t.amount) as total, 
        c.color 
      FROM transactions t
      JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
      WHERE t.book_id = ? AND t.type = ? AND t.transaction_date >= ? AND t.transaction_date <= ? AND t.transfer_id IS NULL AND t.is_internal = 0
      GROUP BY c.id
      ORDER BY total DESC
    `, [this.bookId, type, startDate, endDate]);
  }

  async getSummary(startDate: string, endDate: string) {
    const income = await this.db.getFirstAsync<{ total: number }>(`
      SELECT SUM(amount) as total FROM transactions WHERE book_id = ? AND type = 'income' AND transaction_date >= ? AND transaction_date <= ? AND transfer_id IS NULL AND is_internal = 0
    `, [this.bookId, startDate, endDate]);
    const expense = await this.db.getFirstAsync<{ total: number }>(`
      SELECT SUM(amount) as total FROM transactions WHERE book_id = ? AND type = 'expense' AND transaction_date >= ? AND transaction_date <= ? AND transfer_id IS NULL AND is_internal = 0
    `, [this.bookId, startDate, endDate]);

    return {
      totalIncome: income?.total || 0,
      totalExpense: expense?.total || 0,
    };
  }
}

export class BudgetQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getByMonth(month: string) {
    return this.db.getAllAsync<Budget & { category_name: string, spent: number, color: string }>(`
      SELECT 
        b.*, 
        c.name as category_name,
        c.color as color,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id AND c.book_id = b.book_id
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.book_id = b.book_id
        AND t.transaction_date LIKE ? 
        AND t.type = 'expense'
        AND t.transfer_id IS NULL
        AND t.is_internal = 0
      WHERE b.book_id = ? AND b.month = ?
      GROUP BY b.id
    `, [this.bookId, `${month}%`, month]);
  }

  async getByCategoryMonth(categoryId: number, month: string) {
    return this.db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE book_id = ? AND category_id = ? AND month = ?',
      [this.bookId, categoryId, month]
    );
  }

  async setBudget(categoryId: number, monthlyLimit: number, month: string, rolloverEnabled?: boolean) {
    await assertBookReference(this.db, 'categories', categoryId, this.bookId, 'Kategori');
    const existing = await this.getByCategoryMonth(categoryId, month);

    if (existing) {
      await this.db.runAsync(
        'UPDATE budgets SET monthly_limit = ?, rollover_enabled = ? WHERE id = ? AND book_id = ?',
        [monthlyLimit, rolloverEnabled !== undefined ? (rolloverEnabled ? 1 : 0) : existing.rollover_enabled, existing.id, this.bookId]
      );
    } else {
      await this.db.runAsync(
        'INSERT INTO budgets (category_id, monthly_limit, month, rollover_amount, rollover_enabled, book_id) VALUES (?, ?, ?, 0, ?, ?)',
        [categoryId, monthlyLimit, month, rolloverEnabled ? 1 : 0, this.bookId]
      );
    }
  }

  async toggleRollover(id: number, enabled: boolean) {
    await this.db.runAsync(
      'UPDATE budgets SET rollover_enabled = ? WHERE id = ? AND book_id = ?',
      [enabled ? 1 : 0, id, this.bookId]
    );
  }
}

export class RecurringQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getActive(): Promise<RecurringTransaction[]> {
    return this.db.getAllAsync<RecurringTransaction>(
      'SELECT * FROM recurring_transactions WHERE book_id = ? AND is_active = 1',
      [this.bookId]
    );
  }
  
  async getAll(): Promise<(RecurringTransaction & { category_name: string, wallet_name: string })[]> {
    return this.db.getAllAsync<RecurringTransaction & { category_name: string, wallet_name: string }>(`
      SELECT r.*, c.name as category_name, w.name as wallet_name
      FROM recurring_transactions r
      JOIN categories c ON r.category_id = c.id AND c.book_id = r.book_id
      JOIN wallets w ON r.wallet_id = w.id AND w.book_id = r.book_id
      WHERE r.book_id = ?
      ORDER BY r.id DESC
    `, [this.bookId]);
  }

  /** Recurring aktif yang jatuh tempo dalam `days` hari ke depan (termasuk yang terlewat). */
  async getUpcoming(days: number): Promise<(RecurringTransaction & { category_name: string; category_icon: string; category_color: string; wallet_name: string })[]> {
    const until = dayjs().add(days, 'day').format('YYYY-MM-DD');
    return this.db.getAllAsync(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name
      FROM recurring_transactions r
      JOIN categories c ON r.category_id = c.id AND c.book_id = r.book_id
      JOIN wallets w ON r.wallet_id = w.id AND w.book_id = r.book_id
      WHERE r.book_id = ? AND r.is_active = 1 AND r.next_date <= ?
      ORDER BY r.next_date ASC
    `, [this.bookId, until]);
  }

  async create(rt: Omit<RecurringTransaction, 'id' | 'is_active' | 'book_id'>) {
    await assertBookReference(this.db, 'categories', rt.category_id, this.bookId, 'Kategori');
    await assertBookReference(this.db, 'wallets', rt.wallet_id, this.bookId, 'Dompet');
    await this.db.runAsync(
      'INSERT INTO recurring_transactions (type, amount, category_id, wallet_id, frequency, next_date, notes, book_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [rt.type, rt.amount, rt.category_id, rt.wallet_id, rt.frequency, rt.next_date, rt.notes, this.bookId]
    );
  }
  
  async delete(id: number) {
    await this.db.runAsync('DELETE FROM recurring_transactions WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }

  async toggle(id: number, isActive: boolean) {
    await this.db.runAsync(
      'UPDATE recurring_transactions SET is_active = ? WHERE id = ? AND book_id = ?',
      [isActive ? 1 : 0, id, this.bookId]
    );
  }

  async updateNextDate(id: number, nextDate: string) {
    await this.db.runAsync(
      'UPDATE recurring_transactions SET next_date = ? WHERE id = ? AND book_id = ?',
      [nextDate, id, this.bookId]
    );
  }

  async update(id: number, data: Partial<Omit<RecurringTransaction, 'id' | 'book_id'>>) {
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['type', 'amount', 'category_id', 'wallet_id', 'frequency', 'next_date', 'notes', 'is_active'] as const) {
      const value = data[key];
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id, this.bookId);
    await this.db.runAsync(
      `UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`,
      values
    );
  }
}

export class SavingsGoalQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(): Promise<SavingsGoal[]> {
    return this.db.getAllAsync<SavingsGoal>(
      'SELECT * FROM savings_goals WHERE book_id = ? ORDER BY is_completed ASC, deadline ASC',
      [this.bookId]
    );
  }

  async getById(id: number): Promise<SavingsGoal | null> {
    return this.db.getFirstAsync<SavingsGoal>(
      'SELECT * FROM savings_goals WHERE book_id = ? AND id = ?',
      [this.bookId, id]
    );
  }

  async getContributions(goalId: number): Promise<GoalContribution[]> {
    return this.db.getAllAsync<GoalContribution>(
      `SELECT * FROM goal_contributions
       WHERE book_id = ? AND goal_id = ?
       ORDER BY contribution_date DESC, id DESC`,
      [this.bookId, goalId]
    );
  }

  async create(data: { name: string; target_amount: number; deadline: string | null; wallet_id: number | null; icon: string; color: string }) {
    return this.db.runAsync(
      'INSERT INTO savings_goals (name, target_amount, deadline, wallet_id, icon, color, book_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.target_amount, data.deadline, data.wallet_id, data.icon, data.color, this.bookId]
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
    values.push(id, this.bookId);
    await this.db.runAsync(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`, values);
  }

  async contribute(
    id: number,
    amount: number,
    walletId?: number | null,
    contributionDate = dayjs().format('YYYY-MM-DD'),
    notes?: string | null
  ): Promise<GoalContribution> {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Nominal kontribusi tidak valid');

    const goal = await this.getById(id);
    if (!goal) throw new Error('Target menabung tidak ditemukan');

    const sourceWalletId = walletId ?? goal.wallet_id;
    if (!sourceWalletId) throw new Error('Pilih dompet untuk mencatat kontribusi');
    await assertBookReference(this.db, 'wallets', sourceWalletId, this.bookId, 'Dompet');

    const target = await resolveBookingTarget(this.db, 'expense', sourceWalletId, null, this.bookId);
    if (!target) throw new Error('Dompet atau kategori tidak tersedia');

    let contributionId = 0;
    let transactionId: number | null = null;
    await this.db.withTransactionAsync(async () => {
      const contribution = await this.db.runAsync(
        `INSERT INTO goal_contributions
          (book_id, goal_id, wallet_id, amount, contribution_date, kind, notes)
         VALUES (?, ?, ?, ?, ?, 'contribution', ?)`,
        [this.bookId, id, sourceWalletId, amount, contributionDate, notes ?? null]
      );
      contributionId = contribution.lastInsertRowId;

      transactionId = await insertTransactionWithBalance(this.db, this.bookId, {
        type: 'expense',
        amount,
        category_id: target.categoryId,
        wallet_id: target.walletId,
        transaction_date: contributionDate,
        notes: notes ?? `Tabungan ${goal.name}`,
        recurring_id: null,
        is_internal: 1,
        goal_contribution_id: contributionId,
        source_key: `goal:${id}:${contributionId}`,
      });

      await this.db.runAsync(
        'UPDATE goal_contributions SET transaction_id = ? WHERE id = ? AND book_id = ?',
        [transactionId, contributionId, this.bookId]
      );

      const newTotal = Math.round((goal.current_amount + amount) * 100) / 100;
      await this.db.runAsync(
        'UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ? AND book_id = ?',
        [newTotal, newTotal >= goal.target_amount ? 1 : 0, id, this.bookId]
      );
    });

    const result = await this.db.getFirstAsync<GoalContribution>(
      'SELECT * FROM goal_contributions WHERE id = ? AND book_id = ?',
      [contributionId, this.bookId]
    );
    if (!result) throw new Error('Kontribusi gagal disimpan');
    return result;
  }

  async addFunds(id: number, amount: number, walletId?: number | null) {
    return this.contribute(id, amount, walletId);
  }

  async reverseContribution(contributionId: number, notes?: string | null): Promise<void> {
    const contribution = await this.db.getFirstAsync<GoalContribution>(
      `SELECT * FROM goal_contributions
       WHERE id = ? AND book_id = ? AND kind = 'contribution'`,
      [contributionId, this.bookId]
    );
    if (!contribution) throw new Error('Kontribusi tidak ditemukan');

    const alreadyReversed = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM goal_contributions WHERE reversal_of_id = ? AND book_id = ?',
      [contributionId, this.bookId]
    );
    if (alreadyReversed) throw new Error('Kontribusi sudah dibatalkan');

    const goal = await this.getById(contribution.goal_id);
    if (!goal) throw new Error('Target menabung tidak ditemukan');
    const target = await resolveBookingTarget(this.db, 'income', contribution.wallet_id, null, this.bookId);
    if (!target) throw new Error('Dompet atau kategori tidak tersedia');

    let reversalId = 0;
    await this.db.withTransactionAsync(async () => {
      const reversal = await this.db.runAsync(
        `INSERT INTO goal_contributions
          (book_id, goal_id, wallet_id, amount, contribution_date, kind, reversal_of_id, notes)
         VALUES (?, ?, ?, ?, ?, 'reversal', ?, ?)`,
        [this.bookId, contribution.goal_id, contribution.wallet_id, contribution.amount,
          dayjs().format('YYYY-MM-DD'), contributionId, notes ?? `Pembatalan tabungan ${goal.name}`]
      );
      reversalId = reversal.lastInsertRowId;

      const txId = await insertTransactionWithBalance(this.db, this.bookId, {
        type: 'income',
        amount: contribution.amount,
        category_id: target.categoryId,
        wallet_id: target.walletId,
        transaction_date: dayjs().format('YYYY-MM-DD'),
        notes: notes ?? `Pembatalan tabungan ${goal.name}`,
        recurring_id: null,
        is_internal: 1,
        goal_contribution_id: reversalId,
        source_key: `goal-reversal:${contributionId}`,
      });

      await this.db.runAsync(
        'UPDATE goal_contributions SET transaction_id = ? WHERE id = ? AND book_id = ?',
        [txId, reversalId, this.bookId]
      );
      const newTotal = Math.max(0, Math.round((goal.current_amount - contribution.amount) * 100) / 100);
      await this.db.runAsync(
        'UPDATE savings_goals SET current_amount = ?, is_completed = 0 WHERE id = ? AND book_id = ?',
        [newTotal, contribution.goal_id, this.bookId]
      );
    });
  }

  async markCompleted(id: number, completed: boolean) {
    await this.db.runAsync(
      'UPDATE savings_goals SET is_completed = ? WHERE id = ? AND book_id = ?',
      [completed ? 1 : 0, id, this.bookId]
    );
  }

  async delete(id: number) {
    const contribution = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM goal_contributions WHERE goal_id = ? AND book_id = ? LIMIT 1',
      [id, this.bookId]
    );
    if (contribution) throw new Error('Target yang sudah memiliki histori tidak dapat dihapus');
    await this.db.runAsync('DELETE FROM savings_goals WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }
}

export class BillReminderQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(): Promise<(BillReminder & { category_name?: string; wallet_name?: string })[]> {
    return this.db.getAllAsync(`
      SELECT b.*, c.name as category_name, w.name as wallet_name
      FROM bill_reminders b
      LEFT JOIN categories c ON b.category_id = c.id AND c.book_id = b.book_id
      LEFT JOIN wallets w ON b.wallet_id = w.id AND w.book_id = b.book_id
      WHERE b.book_id = ?
      ORDER BY b.is_paid ASC, b.due_date ASC
    `, [this.bookId]);
  }

  /** Tagihan belum lunas yang jatuh tempo dalam `days` hari ke depan (termasuk yang terlewat). */
  async getUpcoming(days: number): Promise<BillReminder[]> {
    const until = dayjs().add(days, 'day').format('YYYY-MM-DD');
    return this.db.getAllAsync<BillReminder>(
      'SELECT * FROM bill_reminders WHERE book_id = ? AND is_paid = 0 AND due_date <= ? ORDER BY due_date ASC',
      [this.bookId, until]
    );
  }

  async create(data: Omit<BillReminder, 'id' | 'created_at' | 'book_id'>) {
    if (data.category_id) await assertBookReference(this.db, 'categories', data.category_id, this.bookId, 'Kategori');    if (data.wallet_id) await assertBookReference(this.db, 'wallets', data.wallet_id, this.bookId, 'Dompet');
    return this.db.runAsync(
      'INSERT INTO bill_reminders (name, amount, due_date, frequency, is_paid, category_id, wallet_id, notes, book_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.amount, data.due_date, data.frequency, data.is_paid, data.category_id, data.wallet_id, data.notes, this.bookId]
    );
  }

  async update(id: number, data: Partial<Omit<BillReminder, 'id' | 'created_at'>> & { calendar_event_id?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['name', 'amount', 'due_date', 'frequency', 'is_paid', 'category_id', 'wallet_id', 'notes', 'calendar_event_id'] as const) {
      const value = data[key];
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_paid' ? (value ? 1 : 0) : value);
      }
    }
    if (fields.length === 0) return;
    if (data.category_id) await assertBookReference(this.db, 'categories', data.category_id, this.bookId, 'Kategori');
    if (data.wallet_id) await assertBookReference(this.db, 'wallets', data.wallet_id, this.bookId, 'Dompet');
    values.push(id, this.bookId);
    await this.db.runAsync(`UPDATE bill_reminders SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`, values);
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM bill_reminders WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }

  /**
   * Marks a bill paid and books the matching expense, then rolls a recurring bill
   * forward to its next due date (so a monthly bill does not stay "paid" forever).
   * Un-paying deletes the booked transaction and restores the wallet balance.
   * Returns what happened so the UI can report it.
   */
  async setPaid(id: number, isPaid: boolean): Promise<{ booked: boolean; nextDueDate?: string }> {
    const bill = await this.db.getFirstAsync<BillReminder>(
      'SELECT * FROM bill_reminders WHERE id = ? AND book_id = ?',
      [id, this.bookId]
    );
    if (!bill) return { booked: false };

    if (isPaid && bill.is_paid) return { booked: bill.paid_transaction_id != null };

    if (!isPaid) {
      await this.db.withTransactionAsync(async () => {
        if (bill.paid_transaction_id) {
          await deleteTransactionInTransaction(this.db, this.bookId, bill.paid_transaction_id);
        }
        await this.db.runAsync(
          'UPDATE bill_reminders SET is_paid = 0, paid_transaction_id = NULL WHERE id = ? AND book_id = ?',
          [id, this.bookId]
        );
      });
      return { booked: false };
    }

    const target = await resolveBookingTarget(this.db, 'expense', bill.wallet_id, bill.category_id, this.bookId);
    let txId: number | null = null;
    let nextDueDate: string | undefined;
    await this.db.withTransactionAsync(async () => {
      if (target) {
        txId = await insertTransactionWithBalance(this.db, this.bookId, {
          type: 'expense',
          amount: bill.amount,
          category_id: target.categoryId,
          wallet_id: target.walletId,
          transaction_date: dayjs().format('YYYY-MM-DD'),
          notes: `Tagihan ${bill.name}`,
          recurring_id: null,
          source_key: `bill:${id}:${bill.due_date}`,
        });
      }

      if (bill.frequency === 'one_time') {
        await this.db.runAsync(
          'UPDATE bill_reminders SET is_paid = 1, paid_transaction_id = ? WHERE id = ? AND book_id = ?',
          [txId, id, this.bookId]
        );
        return;
      }

      // Recurring bill: advance past today so it reappears as an upcoming bill.
      const step = bill.frequency === 'yearly' ? 12 : 1;
      let next = dayjs(bill.due_date).add(step, 'month');
      const today = dayjs().format('YYYY-MM-DD');
      let guard = 0;
      while (next.format('YYYY-MM-DD') <= today && guard < 24) {
        next = next.add(step, 'month');
        guard++;
      }
      nextDueDate = next.format('YYYY-MM-DD');

      await this.db.runAsync(
        'UPDATE bill_reminders SET is_paid = 0, due_date = ?, paid_transaction_id = NULL WHERE id = ? AND book_id = ?',
        [nextDueDate, id, this.bookId]
      );
    });
    return { booked: txId !== null, nextDueDate };
  }

  async updateCalendarEventId(id: number, eventId: string) {
    await this.db.runAsync(
      'UPDATE bill_reminders SET calendar_event_id = ? WHERE id = ? AND book_id = ?',
      [eventId, id, this.bookId]
    );
  }
}

export class TagQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>(
      'SELECT * FROM tags WHERE book_id = ? ORDER BY name ASC',
      [this.bookId]
    );
  }

  async search(query: string): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>(
      'SELECT * FROM tags WHERE book_id = ? AND name LIKE ? ORDER BY name ASC LIMIT 10',
      [this.bookId, `%${query}%`]
    );
  }

  async create(name: string, color?: string): Promise<Tag> {
    const result = await this.db.runAsync(
      'INSERT OR IGNORE INTO tags (name, color, book_id) VALUES (?, ?, ?)',
      [name, color || '#6366f1', this.bookId]
    );
    if (result.changes === 0) {
      const existing = await this.db.getFirstAsync<Tag>(
        'SELECT * FROM tags WHERE book_id = ? AND name = ?', [this.bookId, name]
      );
      return existing!;
    }
    return { id: result.lastInsertRowId, name, color: color || '#6366f1', created_at: new Date().toISOString() };
  }

  async delete(id: number) {
    await this.db.runAsync('DELETE FROM tags WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }

  async getByTransaction(txId: number): Promise<Tag[]> {
    return this.db.getAllAsync<Tag>(`
      SELECT tg.* FROM tags tg
      JOIN transaction_tags tt ON tg.id = tt.tag_id AND tg.book_id = tt.book_id
      WHERE tt.transaction_id = ? AND tt.book_id = ?
      ORDER BY tg.name ASC
    `, [txId, this.bookId]);
  }

  async addTagToTransaction(txId: number, tagId: number) {
    await assertBookReference(this.db, 'transactions', txId, this.bookId, 'Transaksi');
    await assertBookReference(this.db, 'tags', tagId, this.bookId, 'Tag');
    await this.db.runAsync(
      'INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id, book_id) VALUES (?, ?, ?)',
      [txId, tagId, this.bookId]
    );
  }

  async removeTagFromTransaction(txId: number, tagId: number) {
    await this.db.runAsync(
      'DELETE FROM transaction_tags WHERE transaction_id = ? AND tag_id = ? AND book_id = ?',
      [txId, tagId, this.bookId]
    );
  }

  async setTransactionTags(txId: number, tagIds: number[]) {
    await assertBookReference(this.db, 'transactions', txId, this.bookId, 'Transaksi');
    for (const tagId of tagIds) {
      await assertBookReference(this.db, 'tags', tagId, this.bookId, 'Tag');
    }
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'DELETE FROM transaction_tags WHERE transaction_id = ? AND book_id = ?',
        [txId, this.bookId]
      );
      for (const tagId of tagIds) {
        await this.db.runAsync(
          'INSERT INTO transaction_tags (transaction_id, tag_id, book_id) VALUES (?, ?, ?)',
          [txId, tagId, this.bookId]
        );
      }
    });
  }
}

export class InsightQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

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
      LEFT JOIN transactions t ON c.id = t.category_id AND t.book_id = c.book_id AND t.type = 'expense'
        AND t.transfer_id IS NULL AND t.is_internal = 0
        AND (strftime('%Y-%m', t.transaction_date) = ? OR strftime('%Y-%m', t.transaction_date) = ?)
      WHERE c.type = 'expense' AND c.book_id = ? AND t.book_id = ?
      GROUP BY c.id
      HAVING current_total > 0 OR prev_total > 0
      ORDER BY current_total DESC
    `, [currentMonth, prevMonth, currentMonth, prevMonth, this.bookId, this.bookId]);

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
      LEFT JOIN transactions t ON c.id = t.category_id AND t.book_id = c.book_id AND t.type = 'expense'
        AND t.transfer_id IS NULL AND t.is_internal = 0
      WHERE c.type = 'expense' AND c.book_id = ? AND t.book_id = ?
      GROUP BY c.id
      HAVING current_amount > avg_amount * 2 AND avg_amount > 0
    `, [startLookback, month, month, this.bookId, this.bookId]);

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
      WHERE book_id = ? AND transaction_date >= date('now', '-5 months') AND transfer_id IS NULL AND is_internal = 0
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `, [this.bookId]);

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
      WHERE book_id = ? AND type = 'income' AND strftime('%Y-%m', transaction_date) = ? AND transfer_id IS NULL AND is_internal = 0
    `, [this.bookId, currentMonth]);

    const expense = await this.db.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE book_id = ? AND type = 'expense' AND strftime('%Y-%m', transaction_date) = ? AND transfer_id IS NULL AND is_internal = 0
    `, [this.bookId, currentMonth]);

    const avgExpense = await this.db.getFirstAsync<{ avg: number; total: number }>(`
      SELECT COALESCE(SUM(amount), 0) / 3.0 as avg, COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE book_id = ? AND type = 'expense' AND strftime('%Y-%m', transaction_date) >= ? AND transfer_id IS NULL AND is_internal = 0
    `, [this.bookId, threeMosAgo]);

    const balance = await this.db.getFirstAsync<{ total: number }>(`
      SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE book_id = ?
    `, [this.bookId]);

    const overBudget = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM budgets b
      WHERE b.book_id = ? AND b.month = ? AND (b.monthly_limit + b.rollover_amount) < (
        SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
         WHERE t.category_id = b.category_id AND t.book_id = b.book_id AND t.type = 'expense'
         AND strftime('%Y-%m', t.transaction_date) = b.month
         AND t.transfer_id IS NULL AND t.is_internal = 0
      )
    `, [this.bookId, currentMonth]);

    const goal = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM savings_goals WHERE book_id = ? AND is_completed = 0
    `, [this.bookId]);

    const catBreakdown = await this.db.getAllAsync<{ name: string; total: number }>(`
      SELECT c.name, COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
      WHERE t.book_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ? AND t.transfer_id IS NULL AND t.is_internal = 0
      GROUP BY c.id
      ORDER BY total DESC
    `, [this.bookId, currentMonth]);

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
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getMonthlyTrend(months: number = 12): Promise<MonthlyTrendPoint[]> {
    return this.db.getAllAsync<MonthlyTrendPoint>(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE book_id = ? AND transaction_date >= date('now', ?||' months') AND transfer_id IS NULL AND is_internal = 0
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `, [this.bookId, `-${months}`]);
  }

  async getCashFlow(): Promise<{ month: string; flow: number }[]> {
    return this.db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as flow
      FROM transactions
      WHERE book_id = ? AND transaction_date >= date('now', '-12 months') AND transfer_id IS NULL AND is_internal = 0
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month ASC
    `, [this.bookId]);
  }
}

export class NetWorthQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAssets(): Promise<Asset[]> {
    return this.db.getAllAsync<Asset>(
      'SELECT * FROM assets WHERE book_id = ? ORDER BY created_at DESC', [this.bookId]
    );
  }

  async getAssetById(id: number): Promise<Asset | null> {
    return this.db.getFirstAsync<Asset>(
      'SELECT * FROM assets WHERE book_id = ? AND id = ?', [this.bookId, id]
    );
  }

  async addAsset(data: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'book_id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO assets (name, type, current_value, initial_value, purchase_date, notes, icon, color, book_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, data.current_value, data.initial_value ?? null, data.purchase_date ?? null, data.notes ?? null, data.icon, data.color, this.bookId]
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
    await this.db.runAsync(`UPDATE assets SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`, [...params, this.bookId]);
  }

  async deleteAsset(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM assets WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }

  async getLiabilities(): Promise<Liability[]> {
    return this.db.getAllAsync<Liability>(
      'SELECT * FROM liabilities WHERE book_id = ? ORDER BY created_at DESC', [this.bookId]
    );
  }

  async getLiabilityById(id: number): Promise<Liability | null> {
    return this.db.getFirstAsync<Liability>(
      'SELECT * FROM liabilities WHERE book_id = ? AND id = ?', [this.bookId, id]
    );
  }

  async addLiability(data: Omit<Liability, 'id' | 'created_at' | 'updated_at' | 'book_id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO liabilities (name, type, current_balance, original_amount, interest_rate, monthly_payment, due_date, notes, icon, color, book_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, data.current_balance, data.original_amount ?? null, data.interest_rate ?? null, data.monthly_payment ?? null, data.due_date ?? null, data.notes ?? null, data.icon, data.color, this.bookId]
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
    await this.db.runAsync(`UPDATE liabilities SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`, [...params, this.bookId]);
  }

  async deleteLiability(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM liabilities WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }

  async getCurrentNetWorth(): Promise<{ totalAssets: number; totalLiabilities: number; netWorth: number }> {
    const walletSum = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE book_id = ?', [this.bookId]
    );
    const assetSum = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(current_value), 0) as total FROM assets WHERE book_id = ?', [this.bookId]
    );
    const liabilitySum = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(current_balance), 0) as total FROM liabilities WHERE book_id = ?', [this.bookId]
    );
    // Unsettled person-to-person debts count too: money owed to you is an asset,
    // money you owe is a liability.
    const debtSum = await this.db.getFirstAsync<{ receivable: number; payable: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN direction = 'receivable' THEN amount - paid_amount ELSE 0 END), 0) as receivable,
        COALESCE(SUM(CASE WHEN direction = 'payable' THEN amount - paid_amount ELSE 0 END), 0) as payable
      FROM debts WHERE book_id = ? AND is_settled = 0
    `, [this.bookId]);

    const totalAssets = (walletSum?.total ?? 0) + (assetSum?.total ?? 0) + (debtSum?.receivable ?? 0);
    const totalLiabilities = (liabilitySum?.total ?? 0) + (debtSum?.payable ?? 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  }

  async getNetWorthHistory(months: number = 12): Promise<NetWorthSnapshot[]> {
    return this.db.getAllAsync<NetWorthSnapshot>(
      'SELECT * FROM net_worth_snapshots WHERE book_id = ? ORDER BY snapshot_date DESC LIMIT ?',
      [this.bookId, months]
    );
  }

  async ensureMonthlySnapshot(): Promise<void> {
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const existing = await this.db.getFirstAsync<NetWorthSnapshot>(
      'SELECT id FROM net_worth_snapshots WHERE book_id = ? AND snapshot_date = ?', [this.bookId, monthStart]
    );
    if (existing) return;

    const { totalAssets, totalLiabilities, netWorth } = await this.getCurrentNetWorth();
    await this.db.runAsync(
      'INSERT INTO net_worth_snapshots (snapshot_date, total_assets, total_liabilities, net_worth, book_id) VALUES (?, ?, ?, ?, ?)',
      [monthStart, totalAssets, totalLiabilities, netWorth, this.bookId]
    );
  }
}

export class SubscriptionQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(includeInactive?: boolean): Promise<Subscription[]> {
    const where = includeInactive ? 'WHERE book_id = ?' : 'WHERE book_id = ? AND is_active = 1';
    return this.db.getAllAsync<Subscription>(`SELECT * FROM subscriptions ${where} ORDER BY name ASC`, [this.bookId]);
  }

  async getById(id: number): Promise<Subscription | null> {
    return this.db.getFirstAsync<Subscription>(
      'SELECT * FROM subscriptions WHERE book_id = ? AND id = ?', [this.bookId, id]
    );
  }

  async getTotalMonthly(): Promise<number> {
    const rows = await this.db.getAllAsync<{ amount: number; billing_cycle: string }>(
      'SELECT amount, billing_cycle FROM subscriptions WHERE book_id = ? AND is_active = 1', [this.bookId]
    );
    return rows.reduce((sum, r) => {
      const monthly = r.billing_cycle === 'yearly' ? r.amount / 12 : r.billing_cycle === 'quarterly' ? r.amount / 3 : r.amount;
      return sum + monthly;
    }, 0);
  }

  async getUpcomingRenewals(days: number): Promise<Subscription[]> {
    const until = dayjs().add(days, 'day').format('YYYY-MM-DD');
    return this.db.getAllAsync<Subscription>(
      'SELECT * FROM subscriptions WHERE book_id = ? AND is_active = 1 AND next_billing_date <= ? ORDER BY next_billing_date ASC',
      [this.bookId, until]
    );
  }

  async add(data: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'book_id'>): Promise<number> {
    if (data.wallet_id) await assertBookReference(this.db, 'wallets', data.wallet_id, this.bookId, 'Dompet');
    if (data.category_id) await assertBookReference(this.db, 'categories', data.category_id, this.bookId, 'Kategori');
    const result = await this.db.runAsync(
      `INSERT INTO subscriptions (name, category, amount, billing_cycle, start_date, next_billing_date, wallet_id, category_id, icon, color, is_active, auto_create, remind, calendar_event_id, notes, book_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.category, data.amount, data.billing_cycle, data.start_date, data.next_billing_date,
       data.wallet_id ?? null, data.category_id ?? null, data.icon, data.color, data.is_active ?? 1,
       data.auto_create ?? 1, data.remind ?? 1, data.calendar_event_id ?? null, data.notes ?? null, this.bookId]
    );
    return result.lastInsertRowId;
  }

  async update(id: number, updates: Partial<Subscription>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    for (const key of ['name', 'category', 'amount', 'billing_cycle', 'start_date', 'next_billing_date',
      'wallet_id', 'category_id', 'icon', 'color', 'is_active', 'cancelled_date', 'auto_create',
      'remind', 'calendar_event_id', 'notes'] as const) {
      const value = updates[key];
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (fields.length === 0) return;
    if (updates.wallet_id) await assertBookReference(this.db, 'wallets', updates.wallet_id, this.bookId, 'Dompet');
    if (updates.category_id) await assertBookReference(this.db, 'categories', updates.category_id, this.bookId, 'Kategori');
    fields.push("updated_at = datetime('now')");
    params.push(id);
    await this.db.runAsync(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`, [...params, this.bookId]);
  }

  async cancel(id: number): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    await this.db.runAsync(
      "UPDATE subscriptions SET is_active = 0, cancelled_date = ?, updated_at = datetime('now') WHERE id = ? AND book_id = ?",
      [today, id, this.bookId]
    );
  }

  async clearCalendarEvent(id: number): Promise<void> {
    await this.db.runAsync(
      "UPDATE subscriptions SET calendar_event_id = NULL, updated_at = datetime('now') WHERE id = ? AND book_id = ?",
      [id, this.bookId]
    );
  }

  async processRenewals(): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const dueSubs = await this.db.getAllAsync<Subscription>(
      'SELECT * FROM subscriptions WHERE book_id = ? AND is_active = 1 AND next_billing_date <= ?',
      [this.bookId, today]
    );

    const cycleMonths = (c: Subscription['billing_cycle']) => (c === 'monthly' ? 1 : c === 'yearly' ? 12 : 3);

    for (const sub of dueSubs) {
      await this.db.withTransactionAsync(async () => {
        const target = sub.auto_create
          // Legacy rows (and any sub saved before the form exposed these pickers)
          // have no wallet/category; fall back instead of skipping the booking.
          ? await resolveBookingTarget(this.db, 'expense', sub.wallet_id, sub.category_id, this.bookId)
          : null;

        // Catch up every cycle that already elapsed, not just one per app launch.
        let due = dayjs(sub.next_billing_date);
        let guard = 0;
        while (due.format('YYYY-MM-DD') <= today && guard < 24) {
          const occurrenceDate = due.format('YYYY-MM-DD');
          if (target) {
            await insertTransactionWithBalance(this.db, this.bookId, {
              type: 'expense',
              amount: sub.amount,
              category_id: target.categoryId,
              wallet_id: target.walletId,
              transaction_date: occurrenceDate,
              notes: `Langganan ${sub.name}`,
              recurring_id: null,
              source_key: `subscription:${sub.id}:${occurrenceDate}`,
            });
          }
          due = due.add(cycleMonths(sub.billing_cycle), 'month');
          guard++;
        }

        // The old calendar event points at a past date; mark it stale instead of
        // touching the Calendar API here (boot must not trigger permission dialogs).
        await this.db.runAsync(
          "UPDATE subscriptions SET next_billing_date = ?, calendar_event_id = NULL, updated_at = datetime('now') WHERE id = ? AND book_id = ?",
          [due.format('YYYY-MM-DD'), sub.id, this.bookId]
        );
      });
    }
  }
}

export class DebtQueries {
  constructor(private db: SQLiteDatabase, private bookId: number) {}

  async getAll(includeSettled = true): Promise<(Debt & { wallet_name?: string })[]> {
    return this.db.getAllAsync<Debt & { wallet_name?: string }>(`
      SELECT d.*, w.name as wallet_name
      FROM debts d
      LEFT JOIN wallets w ON d.wallet_id = w.id AND w.book_id = d.book_id
      WHERE d.book_id = ? ${includeSettled ? '' : 'AND d.is_settled = 0'}
      ORDER BY d.is_settled ASC, COALESCE(d.due_date, '9999-12-31') ASC, d.id DESC
    `, [this.bookId]);
  }

  async getById(id: number): Promise<Debt | null> {
    return this.db.getFirstAsync<Debt>(
      'SELECT * FROM debts WHERE book_id = ? AND id = ?', [this.bookId, id]
    );
  }

  async getSummary(): Promise<DebtSummary> {
    const row = await this.db.getFirstAsync<{ receivable: number; payable: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN direction = 'receivable' THEN amount - paid_amount ELSE 0 END), 0) as receivable,
        COALESCE(SUM(CASE WHEN direction = 'payable' THEN amount - paid_amount ELSE 0 END), 0) as payable
      FROM debts WHERE book_id = ? AND is_settled = 0
    `, [this.bookId]);
    const totalReceivable = row?.receivable ?? 0;
    const totalPayable = row?.payable ?? 0;
    return { totalReceivable, totalPayable, net: totalReceivable - totalPayable };
  }

  async getPayments(debtId: number): Promise<DebtPayment[]> {
    return this.db.getAllAsync<DebtPayment>(
      'SELECT * FROM debt_payments WHERE book_id = ? AND debt_id = ? ORDER BY payment_date DESC, id DESC',
      [this.bookId, debtId]
    );
  }

  /**
   * Records a debt. When `bookTransaction` is set, the principal also moves through
   * a wallet: lending out money is an expense, borrowing is income.
   */
  async create(
    data: {
      person_name: string;
      direction: DebtDirection;
      amount: number;
      due_date?: string | null;
      wallet_id?: number | null;
      notes?: string | null;
    },
    bookTransaction = false
  ): Promise<number> {
    let newId = 0;
    if (data.wallet_id) await assertBookReference(this.db, 'wallets', data.wallet_id, this.bookId, 'Dompet');
    await this.db.withTransactionAsync(async () => {
      const res = await this.db.runAsync(
        'INSERT INTO debts (person_name, direction, amount, due_date, wallet_id, notes, book_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.person_name, data.direction, data.amount, data.due_date ?? null, data.wallet_id ?? null, data.notes ?? null, this.bookId]
      );
      newId = res.lastInsertRowId;

      if (bookTransaction) {
        const type: TransactionType = data.direction === 'receivable' ? 'expense' : 'income';
        const target = await resolveBookingTarget(this.db, type, data.wallet_id, null, this.bookId);
        if (target) {
          await insertTransactionWithBalance(this.db, this.bookId, {
            type,
            amount: data.amount,
            category_id: target.categoryId,
            wallet_id: target.walletId,
            transaction_date: dayjs().format('YYYY-MM-DD'),
            notes: data.direction === 'receivable'
              ? `Piutang ${data.person_name}`
              : `Utang dari ${data.person_name}`,
            recurring_id: null,
          });
        }
      }
    });
    return newId;
  }

  async update(id: number, data: Partial<Omit<Debt, 'id' | 'created_at' | 'updated_at' | 'paid_amount'>>) {
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['person_name', 'direction', 'amount', 'due_date', 'wallet_id', 'notes', 'is_settled'] as const) {
      const value = data[key];
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_settled' ? (value ? 1 : 0) : value);
      }
    }
    if (fields.length === 0) return;
    if (data.wallet_id) await assertBookReference(this.db, 'wallets', data.wallet_id, this.bookId, 'Dompet');
    fields.push("updated_at = datetime('now')");
    values.push(id, this.bookId);
    await this.db.runAsync(`UPDATE debts SET ${fields.join(', ')} WHERE id = ? AND book_id = ?`, values);
  }

  /**
   * Adds a repayment. Receiving money back on a receivable is income; paying down
   * what you owe is an expense. Settles the debt once fully repaid.
   */
  async addPayment(
    debtId: number,
    amount: number,
    opts: { date?: string; walletId?: number | null; notes?: string | null; bookTransaction?: boolean } = {}
  ): Promise<{ settled: boolean; remaining: number }> {
    const debt = await this.getById(debtId);
    if (!debt) return { settled: false, remaining: 0 };

    const date = opts.date ?? dayjs().format('YYYY-MM-DD');
    const capped = Math.min(amount, Math.max(0, debt.amount - debt.paid_amount));
    if (capped <= 0) return { settled: !!debt.is_settled, remaining: 0 };

    let settled = false;
    let remaining = 0;

    await this.db.withTransactionAsync(async () => {
      let txId: number | null = null;
      if (opts.bookTransaction !== false) {
        const type: TransactionType = debt.direction === 'receivable' ? 'income' : 'expense';
        const target = await resolveBookingTarget(this.db, type, opts.walletId ?? debt.wallet_id, null, this.bookId);
        if (target) {
          txId = await insertTransactionWithBalance(this.db, this.bookId, {
            type,
            amount: capped,
            category_id: target.categoryId,
            wallet_id: target.walletId,
            transaction_date: date,
            notes: debt.direction === 'receivable'
              ? `Pelunasan piutang ${debt.person_name}`
              : `Pembayaran utang ke ${debt.person_name}`,
            recurring_id: null,
          });
        }
      }

      await this.db.runAsync(
        'INSERT INTO debt_payments (debt_id, amount, payment_date, transaction_id, notes, book_id) VALUES (?, ?, ?, ?, ?, ?)',
        [debtId, capped, date, txId, opts.notes ?? null, this.bookId]
      );

      const paid = Math.round((debt.paid_amount + capped) * 100) / 100;
      settled = paid >= debt.amount - 0.01;
      remaining = Math.max(0, Math.round((debt.amount - paid) * 100) / 100);

      await this.db.runAsync(
        "UPDATE debts SET paid_amount = ?, is_settled = ?, updated_at = datetime('now') WHERE id = ?",
        [paid, settled ? 1 : 0, debtId]
      );
    });

    return { settled, remaining };
  }

  /** Deletes the debt; its payment rows cascade. Booked transactions are kept. */
  async delete(id: number) {
    await this.db.runAsync('DELETE FROM debts WHERE id = ? AND book_id = ?', [id, this.bookId]);
  }
}

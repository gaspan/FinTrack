import { TransferQueries } from '@/lib/queries';

function makeDb() {
  const inserted: any[][] = [];
  const updated: any[][] = [];
  const deleted: any[][] = [];
  const db: any = {
    getFirstAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      const text = String(sql);
      if (text.includes('FROM wallets')) return Promise.resolve({ id: params[0] });
      if (text.includes('FROM categories')) return Promise.resolve({ id: params[0] });
      if (text.includes('source_key')) return Promise.resolve(null);
      if (text.includes('FROM transactions')) return Promise.resolve(null);
      return Promise.resolve(null);
    }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      const text = String(sql);
      if (text.includes('INSERT INTO transactions')) {
        inserted.push(params);
        return Promise.resolve({ lastInsertRowId: inserted.length, changes: 1 });
      }
      if (text.includes('UPDATE')) updated.push([text, ...params]);
      if (text.includes('DELETE FROM transactions')) deleted.push(params);
      return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
  };
  return { db, inserted, updated, deleted };
}

const transferPair = [
  { id: 1, type: 'expense', amount: 500000, wallet_id: 1, transfer_id: 10, transaction_date: '2026-02-01', book_id: 1 },
  { id: 2, type: 'income', amount: 500000, wallet_id: 2, transfer_id: 10, transaction_date: '2026-02-01', book_id: 1 },
];

describe('TransferQueries', () => {
  it('createTransfer mencatat dua leg berlawanan dan menggeser saldo kedua dompet', async () => {
    const { db, inserted } = makeDb();
    await new TransferQueries(db, 1).createTransfer({
      sourceWalletId: 1,
      targetWalletId: 2,
      amount: 500000,
      date: '2026-02-01',
      notes: 'Pindah ke tabungan',
    });

    expect(inserted).toHaveLength(2);
    const [expense, income] = inserted;
    expect(expense[0]).toBe('expense');
    expect(expense[3]).toBe(1);
    expect(expense[8]).toBeNull();
    expect(income[0]).toBe('income');
    expect(income[3]).toBe(2);
    expect(income[8]).toBe(1); // transfer_id = id transaksi pertama
  });

  it('createTransfer menolak dompet asal dan tujuan yang sama', async () => {
    const { db } = makeDb();
    await expect(new TransferQueries(db, 1).createTransfer({
      sourceWalletId: 1,
      targetWalletId: 1,
      amount: 100000,
      date: '2026-02-01',
    })).rejects.toThrow('berbeda');
  });

  it('updateTransfer mengubah nominal kedua leg dan mengoreksi saldo', async () => {
    const { db, updated } = makeDb();
    db.getAllAsync = jest.fn().mockResolvedValue(transferPair);
    const queries = new TransferQueries(db, 1);
    await queries.updateTransfer(10, { amount: 750000, date: '2026-02-02' });

    const txUpdates = updated.filter(([sql]: any[]) => String(sql).includes('amount = ?'));
    expect(txUpdates).toHaveLength(2);
    expect(txUpdates[0][1]).toBe(750000);
  });

  it('deleteTransfer menghapus kedua leg dan mengembalikan saldo dompet', async () => {
    const { db, deleted } = makeDb();
    db.getAllAsync = jest.fn().mockImplementation((sql: string) => {
      if (String(sql).includes('FROM transactions WHERE transfer_id')) {
        return Promise.resolve(transferPair);
      }
      return Promise.resolve([]);
    });
    db.getFirstAsync = jest.fn().mockImplementation((sql: string) => {
      if (String(sql).includes('FROM transactions WHERE id')) {
        return Promise.resolve(transferPair[0]);
      }
      if (String(sql).includes('FROM wallets')) return Promise.resolve({ id: 1 });
      return Promise.resolve(null);
    });

    await new TransferQueries(db, 1).deleteTransfer(10);

    expect(deleted).toHaveLength(2);
  });
});

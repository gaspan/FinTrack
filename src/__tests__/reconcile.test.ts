import { reconcileWalletBalances } from '../features/wallets/reconcile';

function makeDb(rows: { id: number; balance: number; initial_balance: number; book_id: number }[], txSums: Record<number, number>) {
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
    getFirstAsync: jest.fn().mockImplementation((_sql: string, params: any[]) => {
      const walletId = params[1];
      return Promise.resolve({ total: txSums[walletId] || 0 });
    }),
    runAsync: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('reconcileWalletBalances', () => {
  it('corrects drift between balance and initial_balance + transactions', async () => {
    const db = makeDb(
      [{ id: 1, balance: 500000, initial_balance: 300000, book_id: 1 }],
      { 1: 150000 }
    );
    await reconcileWalletBalances(db);
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE wallets SET balance = ? WHERE id = ?',
      [450000, 1]
    );
  });

  it('does not update when balance is correct', async () => {
    const db = makeDb(
      [{ id: 1, balance: 500000, initial_balance: 300000, book_id: 1 }],
      { 1: 200000 }
    );
    await reconcileWalletBalances(db);
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('handles multiple wallets', async () => {
    const db = makeDb(
      [
        { id: 1, balance: 100000, initial_balance: 50000, book_id: 1 },
        { id: 2, balance: 200000, initial_balance: 200000, book_id: 1 },
      ],
      { 1: 60000, 2: 0 }
    );
    await reconcileWalletBalances(db);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE wallets SET balance = ? WHERE id = ?',
      [110000, 1]
    );
  });
  it('dompet baru dengan saldo awal tidak dinolkan (regresi bug initial_balance)', async () => {
    // WalletQueries.create kini menulis initial_balance = saldo awal, sehingga
    // reconcile tidak lagi menghapus saldo dompet yang belum punya transaksi.
    const db = makeDb([{ id: 1, balance: 5000000, initial_balance: 5000000, book_id: 1 }], { 1: 0 });
    await reconcileWalletBalances(db);
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});

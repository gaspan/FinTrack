import { WalletQueries, resolveBookingTarget } from '@/lib/queries';

function makeDb(overrides: Partial<Record<string, any>> = {}) {
  return {
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 99 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
    ...overrides,
  } as any;
}

describe('WalletQueries.create', () => {
  it('menyimpan initial_balance sama dengan saldo awal (cegah saldo hilang saat reconcile)', async () => {
    const db = makeDb();
    await new WalletQueries(db, 1).create({ name: 'BCA', balance: 5_000_000, icon: 'card-outline', color: '#3B82F6' });

    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toContain('initial_balance');
    // name, balance, initial_balance, icon, color, book_id
    expect(params).toEqual(['BCA', 5_000_000, 5_000_000, 'card-outline', '#3B82F6', 1]);
  });
});

describe('WalletQueries.update', () => {
  it('menggeser balance sebesar perubahan saldo awal', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValue({ balance: 700_000, initial_balance: 500_000 }),
    });
    // Saldo awal dikoreksi 500rb -> 600rb, transaksi tercatat +200rb tetap utuh.
    await new WalletQueries(db, 1).update(1, { name: 'Cash', balance: 600_000, icon: 'cash-outline', color: '#10B981' });

    const [, params] = db.runAsync.mock.calls[0];
    expect(params).toEqual(['Cash', 'cash-outline', '#10B981', 600_000, 800_000, 1, 1]);
  });

  it('tidak melakukan apa pun bila dompet tidak ditemukan', async () => {
    const db = makeDb();
    await new WalletQueries(db, 1).update(42, { name: 'X', balance: 1, icon: 'i', color: '#000' });
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});

describe('WalletQueries.delete', () => {
  it('memindahkan status utama ke dompet lain saat dompet utama dihapus', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ is_primary: 1 })
        .mockResolvedValueOnce({ id: 3 }),
    });
    await new WalletQueries(db, 1).delete(1);

    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM wallets WHERE id = ? AND book_id = ?', [1, 1]);
    expect(db.runAsync).toHaveBeenCalledWith('UPDATE wallets SET is_primary = 1 WHERE id = ?', [3]);
  });

  it('tidak menunjuk dompet utama baru bila yang dihapus bukan utama', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ is_primary: 0 }) });
    await new WalletQueries(db, 1).delete(2);

    expect(db.runAsync).toHaveBeenCalledTimes(1);
  });
});

describe('resolveBookingTarget', () => {
  it('memakai wallet & kategori yang diberikan tanpa query tambahan', async () => {
    const db = makeDb();
    const res = await resolveBookingTarget(db, 'expense', 7, 12, 1);

    expect(res).toEqual({ walletId: 7, categoryId: 12 });
    expect(db.getFirstAsync).not.toHaveBeenCalled();
  });

  it('fallback ke dompet utama dan kategori "Lainnya" untuk data lama', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ id: 4 })
        .mockResolvedValueOnce({ id: 9 }),
    });
    const res = await resolveBookingTarget(db, 'expense', null, null, 1);

    expect(res).toEqual({ walletId: 4, categoryId: 9 });
  });

  it('membuat kategori "Lainnya" bila tidak ada kategori sama sekali', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ id: 4 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 77 }),
    });
    const res = await resolveBookingTarget(db, 'income', null, null, 1);

    expect(res).toEqual({ walletId: 4, categoryId: 77 });
    expect(db.runAsync.mock.calls[0][0]).toContain('INSERT INTO categories');
  });

  it('mengembalikan null bila tidak ada dompet sama sekali', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue(null) });
    expect(await resolveBookingTarget(db, 'expense', null, null, 1)).toBeNull();
  });
});

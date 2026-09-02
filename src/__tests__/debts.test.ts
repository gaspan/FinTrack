import { DebtQueries, NetWorthQueries } from '@/lib/queries';

function makeDb(debt: Record<string, any> | null = null, sums: Record<string, any> = {}) {
  const inserted: any[][] = [];
  const debtUpdates: any[][] = [];
  const payments: any[][] = [];
  const db: any = {
    getFirstAsync: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM debts') && sql.includes('AND id = ?')) return Promise.resolve(debt);
      if (sql.includes('FROM debts')) return Promise.resolve(sums.debts ?? { receivable: 0, payable: 0 });
      if (sql.includes('FROM wallets')) return Promise.resolve(sums.wallet ?? { id: 4, total: 0 });
      if (sql.includes('FROM categories')) return Promise.resolve({ id: 9 });
      if (sql.includes('FROM assets')) return Promise.resolve({ total: sums.assets ?? 0 });
      if (sql.includes('FROM liabilities')) return Promise.resolve({ total: sums.liabilities ?? 0 });
      return Promise.resolve(null);
    }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO transactions')) inserted.push(params);
      if (sql.includes('INSERT INTO debt_payments')) payments.push(params);
      if (sql.includes('UPDATE debts')) debtUpdates.push(params);
      return Promise.resolve({ lastInsertRowId: 7 });
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
  };
  return { db, inserted, debtUpdates, payments };
}

const baseDebt = (over: Record<string, any> = {}) => ({
  id: 1, person_name: 'Budi', direction: 'receivable', amount: 1_000_000,
  paid_amount: 0, due_date: null, wallet_id: 2, notes: null, is_settled: 0,
  ...over,
});

describe('DebtQueries.create', () => {
  it('memberi pinjaman mencatat pengeluaran dari dompet', async () => {
    const { db, inserted } = makeDb();
    await new DebtQueries(db, 1).create(
      { person_name: 'Budi', direction: 'receivable', amount: 500_000, wallet_id: 2 },
      true
    );

    expect(inserted).toHaveLength(1);
    expect(inserted[0][0]).toBe('expense');
    expect(inserted[0][1]).toBe(500_000);
  });

  it('menerima pinjaman mencatat pemasukan ke dompet', async () => {
    const { db, inserted } = makeDb();
    await new DebtQueries(db, 1).create(
      { person_name: 'Ani', direction: 'payable', amount: 750_000, wallet_id: 2 },
      true
    );

    expect(inserted[0][0]).toBe('income');
  });

  it('tidak membuat transaksi bila bookTransaction tidak diaktifkan', async () => {
    const { db, inserted } = makeDb();
    await new DebtQueries(db, 1).create({ person_name: 'Budi', direction: 'receivable', amount: 100 });

    expect(inserted).toHaveLength(0);
  });
});

describe('DebtQueries.addPayment', () => {
  it('pelunasan piutang tercatat sebagai pemasukan', async () => {
    const { db, inserted } = makeDb(baseDebt());
    await new DebtQueries(db, 1).addPayment(1, 400_000);

    expect(inserted[0][0]).toBe('income');
    expect(inserted[0][1]).toBe(400_000);
  });

  it('pembayaran utang tercatat sebagai pengeluaran', async () => {
    const { db, inserted } = makeDb(baseDebt({ direction: 'payable' }));
    await new DebtQueries(db, 1).addPayment(1, 200_000);

    expect(inserted[0][0]).toBe('expense');
  });

  it('menandai lunas saat pembayaran menutup sisa', async () => {
    const { db, debtUpdates } = makeDb(baseDebt({ paid_amount: 600_000 }));
    const res = await new DebtQueries(db, 1).addPayment(1, 400_000);

    expect(res.settled).toBe(true);
    expect(res.remaining).toBe(0);
    expect(debtUpdates[0]).toEqual([1_000_000, 1, 1]);
  });

  it('pembayaran sebagian menyisakan saldo dan belum lunas', async () => {
    const { db, debtUpdates } = makeDb(baseDebt());
    const res = await new DebtQueries(db, 1).addPayment(1, 250_000);

    expect(res.settled).toBe(false);
    expect(res.remaining).toBe(750_000);
    expect(debtUpdates[0]).toEqual([250_000, 0, 1]);
  });

  it('membatasi pembayaran maksimal sebesar sisa utang', async () => {
    const { db, payments } = makeDb(baseDebt({ paid_amount: 900_000 }));
    const res = await new DebtQueries(db, 1).addPayment(1, 999_999);

    expect(payments[0][1]).toBe(100_000);
    expect(res.settled).toBe(true);
  });

  it('menolak pembayaran pada utang yang sudah lunas', async () => {
    const { db, payments } = makeDb(baseDebt({ paid_amount: 1_000_000, is_settled: 1 }));
    const res = await new DebtQueries(db, 1).addPayment(1, 50_000);

    expect(payments).toHaveLength(0);
    expect(res.settled).toBe(true);
  });

  it('menyimpan tanggal pembayaran yang diberikan', async () => {
    const { db, payments } = makeDb(baseDebt());
    await new DebtQueries(db, 1).addPayment(1, 100_000, { date: '2026-03-15' });

    expect(payments[0][2]).toBe('2026-03-15');
  });

  it('dapat mencatat tanpa membuat transaksi', async () => {
    const { db, inserted, payments } = makeDb(baseDebt());
    await new DebtQueries(db, 1).addPayment(1, 100_000, { bookTransaction: false });

    expect(inserted).toHaveLength(0);
    expect(payments[0][3]).toBeNull();
  });
});

describe('DebtQueries.getSummary', () => {
  it('menghitung posisi bersih piutang dikurangi utang', async () => {
    const { db } = makeDb(null, { debts: { receivable: 800_000, payable: 300_000 } });
    const res = await new DebtQueries(db, 1).getSummary();

    expect(res).toEqual({ totalReceivable: 800_000, totalPayable: 300_000, net: 500_000 });
  });
});

describe('NetWorthQueries.getCurrentNetWorth', () => {
  it('memasukkan piutang sebagai aset dan utang sebagai kewajiban', async () => {
    const { db } = makeDb(null, {
      wallet: { total: 2_000_000 },
      assets: 1_000_000,
      liabilities: 500_000,
      debts: { receivable: 300_000, payable: 200_000 },
    });
    const res = await new NetWorthQueries(db, 1).getCurrentNetWorth();

    expect(res.totalAssets).toBe(3_300_000);
    expect(res.totalLiabilities).toBe(700_000);
    expect(res.netWorth).toBe(2_600_000);
  });
});

describe('DebtQueries.getPayments', () => {
  it('mengambil riwayat pembayaran terurut dari yang terbaru', async () => {
    const { db } = makeDb(baseDebt());
    await new DebtQueries(db, 1).getPayments(1);

    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toContain('FROM debt_payments');
    expect(sql).toContain('ORDER BY payment_date DESC');
    expect(params).toEqual([1, 1]);
  });
});

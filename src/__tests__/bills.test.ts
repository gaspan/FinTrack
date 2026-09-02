import dayjs from 'dayjs';
import { BillReminderQueries } from '@/lib/queries';

function makeDb(bill: Record<string, any> | null, opts: { txExists?: boolean } = {}) {
  const inserted: any[][] = [];
  const billUpdates: any[][] = [];
  const db: any = {
    getFirstAsync: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM bill_reminders')) return Promise.resolve(bill);
      if (sql.includes('FROM transactions WHERE id')) {
        return Promise.resolve(opts.txExists === false ? null : { id: 55, type: 'expense', amount: bill?.amount, wallet_id: bill?.wallet_id });
      }
      if (sql.includes('SELECT * FROM transactions')) {
        return Promise.resolve({ id: 55, type: 'expense', amount: bill?.amount, wallet_id: bill?.wallet_id });
      }
      if (sql.includes('FROM wallets')) return Promise.resolve({ id: 4 });
      if (sql.includes('FROM categories')) return Promise.resolve({ id: 9 });
      return Promise.resolve(null);
    }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO transactions')) inserted.push(params);
      if (sql.includes('UPDATE bill_reminders')) billUpdates.push([sql, ...params]);
      return Promise.resolve({ lastInsertRowId: 55 });
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
  };
  return { db, inserted, billUpdates };
}

const baseBill = (over: Record<string, any> = {}) => ({
  id: 1, name: 'Listrik', amount: 350_000, due_date: dayjs().format('YYYY-MM-DD'),
  frequency: 'monthly', is_paid: 0, category_id: 5, wallet_id: 2, notes: null,
  paid_transaction_id: null, created_at: '2026-01-01',
  ...over,
});

describe('BillReminderQueries.setPaid', () => {
  it('mencatat pengeluaran saat tagihan ditandai lunas', async () => {
    const { db, inserted } = makeDb(baseBill());
    const res = await new BillReminderQueries(db, 1).setPaid(1, true);

    expect(res.booked).toBe(true);
    expect(inserted).toHaveLength(1);
    const [type, amount, categoryId, walletId] = inserted[0];
    expect(type).toBe('expense');
    expect(amount).toBe(350_000);
    expect(categoryId).toBe(5);
    expect(walletId).toBe(2);
  });

  it('tagihan bulanan maju ke jatuh tempo berikutnya dan kembali belum lunas', async () => {
    const due = dayjs().format('YYYY-MM-DD');
    const { db, billUpdates } = makeDb(baseBill({ due_date: due }));
    const res = await new BillReminderQueries(db, 1).setPaid(1, true);

    expect(res.nextDueDate).toBe(dayjs(due).add(1, 'month').format('YYYY-MM-DD'));
    const update = billUpdates[0];
    expect(update[0]).toContain('is_paid = 0');
    expect(update[1]).toBe(res.nextDueDate);
  });

  it('tagihan sekali pakai tetap berstatus lunas dan menyimpan id transaksi', async () => {
    const { db, billUpdates } = makeDb(baseBill({ frequency: 'one_time' }));
    const res = await new BillReminderQueries(db, 1).setPaid(1, true);

    expect(res.nextDueDate).toBeUndefined();
    expect(billUpdates[0][0]).toContain('is_paid = 1');
    expect(billUpdates[0][1]).toBe(55);
  });

  it('tagihan tahunan maju 12 bulan', async () => {
    const due = dayjs().format('YYYY-MM-DD');
    const { db } = makeDb(baseBill({ frequency: 'yearly', due_date: due }));
    const res = await new BillReminderQueries(db, 1).setPaid(1, true);

    expect(res.nextDueDate).toBe(dayjs(due).add(12, 'month').format('YYYY-MM-DD'));
  });

  it('melewati jatuh tempo yang sudah lewat sampai melampaui hari ini', async () => {
    const due = dayjs().subtract(3, 'month').format('YYYY-MM-DD');
    const { db } = makeDb(baseBill({ due_date: due }));
    const res = await new BillReminderQueries(db, 1).setPaid(1, true);

    expect(dayjs(res.nextDueDate).isAfter(dayjs(), 'day')).toBe(true);
  });

  it('membatalkan lunas menghapus transaksi yang sudah dibukukan', async () => {
    const { db } = makeDb(baseBill({ is_paid: 1, paid_transaction_id: 55 }));
    await new BillReminderQueries(db, 1).setPaid(1, false);

    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM transactions WHERE id = ?', [55]);
    const clear = db.runAsync.mock.calls.find((c: any[]) => String(c[0]).includes('paid_transaction_id = NULL'));
    expect(clear).toBeTruthy();
  });

  it('tidak melakukan apa pun bila tagihan tidak ditemukan', async () => {
    const { db } = makeDb(null);
    const res = await new BillReminderQueries(db, 1).setPaid(99, true);

    expect(res).toEqual({ booked: false });
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});

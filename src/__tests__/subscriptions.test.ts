import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionQueries } from '@/lib/queries';
import { rescheduleAllReminders } from '@/features/notifications/localNotifications';

type Sub = Record<string, any>;

function makeDb(subs: Sub[]) {
  const inserted: any[][] = [];
  const updated: any[][] = [];
  const db: any = {
    getAllAsync: jest.fn().mockResolvedValue(subs),
    getFirstAsync: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM wallets')) return Promise.resolve({ id: 4 });
      if (sql.includes('FROM categories')) return Promise.resolve({ id: 9 });
      return Promise.resolve(null);
    }),
    runAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO transactions')) inserted.push(params);
      if (sql.includes('UPDATE subscriptions')) updated.push(params);
      return Promise.resolve({ lastInsertRowId: 1 });
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
  };
  return { db, inserted, updated };
}

const baseSub = (over: Sub = {}): Sub => ({
  id: 1, name: 'Netflix', amount: 186_000, billing_cycle: 'monthly',
  wallet_id: 2, category_id: 5, auto_create: 1, is_active: 1,
  next_billing_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
  ...over,
});

describe('SubscriptionQueries.processRenewals', () => {
  it('mencatat transaksi pengeluaran saat tagihan jatuh tempo', async () => {
    const { db, inserted, updated } = makeDb([baseSub()]);
    await new SubscriptionQueries(db).processRenewals();

    expect(inserted).toHaveLength(1);
    const [type, amount, categoryId, walletId] = inserted[0];
    expect(type).toBe('expense');
    expect(amount).toBe(186_000);
    expect(categoryId).toBe(5);
    expect(walletId).toBe(2);
    expect(updated).toHaveLength(1);
  });

  it('fallback ke dompet utama & kategori Lainnya untuk langganan lama tanpa wallet/kategori', async () => {
    const { db, inserted } = makeDb([baseSub({ wallet_id: null, category_id: null })]);
    await new SubscriptionQueries(db).processRenewals();

    expect(inserted).toHaveLength(1);
    const [, , categoryId, walletId] = inserted[0];
    expect(walletId).toBe(4);
    expect(categoryId).toBe(9);
  });

  it('tidak mencatat transaksi bila auto_create nonaktif, tapi tanggal tetap maju', async () => {
    const { db, inserted, updated } = makeDb([baseSub({ auto_create: 0 })]);
    await new SubscriptionQueries(db).processRenewals();

    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(1);
  });

  it('menyusul seluruh siklus yang terlewat, bukan hanya satu', async () => {
    const threeMonthsAgo = dayjs().subtract(3, 'month').format('YYYY-MM-DD');
    const { db, inserted } = makeDb([baseSub({ next_billing_date: threeMonthsAgo })]);
    await new SubscriptionQueries(db).processRenewals();

    expect(inserted.length).toBeGreaterThanOrEqual(3);
    // Tanggal transaksi memakai tanggal jatuh tempo asli, bukan hari ini.
    expect(inserted[0][4]).toBe(threeMonthsAgo);
  });

  it('memajukan tanggal sesuai siklus tahunan', async () => {
    const due = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const { db, updated } = makeDb([baseSub({ billing_cycle: 'yearly', next_billing_date: due })]);
    await new SubscriptionQueries(db).processRenewals();

    expect(updated[0][0]).toBe(dayjs(due).add(12, 'month').format('YYYY-MM-DD'));
  });

  it('memajukan tanggal sesuai siklus kuartalan', async () => {
    const due = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const { db, updated } = makeDb([baseSub({ billing_cycle: 'quarterly', next_billing_date: due })]);
    await new SubscriptionQueries(db).processRenewals();

    expect(updated[0][0]).toBe(dayjs(due).add(3, 'month').format('YYYY-MM-DD'));
  });
});

describe('SubscriptionQueries.processRenewals — kalender', () => {
  it('menandai calendar_event_id basi (NULL) saat tanggal bergeser', async () => {
    const { db, updated } = makeDb([baseSub({ calendar_event_id: 'evt-1' })]);
    await new SubscriptionQueries(db).processRenewals();

    expect(updated).toHaveLength(1);
    const updateSql = db.runAsync.mock.calls.find((c: any[]) => String(c[0]).includes('UPDATE subscriptions'))[0];
    expect(updateSql).toContain('calendar_event_id = NULL');
  });
});

describe('rescheduleAllReminders — flag remind', () => {
  it('hanya menjadwalkan notifikasi untuk langganan dengan remind = 1', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(key === 'notif_enabled' ? 'true' : null)
    );

    const db: any = {
      getAllAsync: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('FROM bill_reminders')) return Promise.resolve([]);
        if (sql.includes('FROM subscriptions')) {
          // Engine-side filter: only remind = 1 rows reach the scheduler.
          expect(sql).toContain('remind = 1');
          return Promise.resolve([
            { id: 1, name: 'Netflix', next_billing_date: dayjs().add(7, 'day').format('YYYY-MM-DD') },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    const scheduleMock = Notifications.scheduleNotificationAsync as unknown as jest.Mock;
    scheduleMock.mockClear();
    await rescheduleAllReminders(db);

    const subCalls = scheduleMock.mock.calls.filter(
      (c: any[]) => c[0]?.content?.data?.subId !== undefined
    );
    expect(subCalls).toHaveLength(1);
  });
});

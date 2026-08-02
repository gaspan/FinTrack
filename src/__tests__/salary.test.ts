import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSalaryProjection } from '@/utils/salary';
import { TransactionQueries } from '@/lib/queries';
import { findSalaryCategoryId } from '@/utils/payroll';

jest.mock('@/utils/payroll', () => {
  const actual = jest.requireActual('@/utils/payroll');
  return { ...actual, findSalaryCategoryId: jest.fn() };
});

const findSalaryCategoryIdMock = findSalaryCategoryId as jest.MockedFunction<typeof findSalaryCategoryId>;
const getByDateRangeSpy = jest.spyOn(TransactionQueries.prototype, 'getByDateRange');

const db = {} as any;

beforeEach(() => {
  jest.clearAllMocks();
  findSalaryCategoryIdMock.mockResolvedValue(1);
  getByDateRangeSpy.mockResolvedValue([]);
});

describe('getSalaryProjection', () => {
  it('mengembalikan null jika payroll nonaktif', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('false');

    const result = await getSalaryProjection(db);

    expect(result).toBeNull();
    expect(getByDateRangeSpy).not.toHaveBeenCalled();
  });

  it('mengembalikan null jika tidak ada kategori gaji', async () => {
    findSalaryCategoryIdMock.mockResolvedValue(null);

    const result = await getSalaryProjection(db);

    expect(result).toBeNull();
  });

  it('mengembalikan null jika tidak ada transaksi gaji dalam 3 bulan', async () => {
    getByDateRangeSpy.mockResolvedValue([
      { id: 1, type: 'expense', amount: 100000, category_id: 1, wallet_id: 1, transaction_date: dayjs().format('YYYY-MM-DD'), notes: null, recurring_id: null, created_at: '' } as any,
    ]);

    const result = await getSalaryProjection(db);

    expect(result).toBeNull();
  });

  it('menghitung rata-rata gaji 3 bulan terakhir dan tanggal gaji berikutnya', async () => {
    getByDateRangeSpy.mockResolvedValue([
      { id: 1, type: 'income', amount: 5000000, category_id: 1, wallet_id: 1, transaction_date: dayjs().subtract(1, 'month').format('YYYY-MM-DD'), notes: null, recurring_id: null, created_at: '' } as any,
      { id: 2, type: 'income', amount: 7000000, category_id: 1, wallet_id: 1, transaction_date: dayjs().subtract(2, 'month').format('YYYY-MM-DD'), notes: null, recurring_id: null, created_at: '' } as any,
    ]);

    const result = await getSalaryProjection(db);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(6000000);
    expect(result!.salaryCategoryId).toBe(1);
    expect(dayjs(result!.nextDate).date()).toBe(25);
    expect(dayjs(result!.nextDate).isBefore(dayjs().startOf('day'))).toBe(false);
  });

  it('hanya menghitung transaksi kategori gaji', async () => {
    getByDateRangeSpy.mockResolvedValue([
      { id: 1, type: 'income', amount: 5000000, category_id: 1, wallet_id: 1, transaction_date: dayjs().subtract(1, 'month').format('YYYY-MM-DD'), notes: null, recurring_id: null, created_at: '' } as any,
      { id: 2, type: 'income', amount: 99999999, category_id: 2, wallet_id: 1, transaction_date: dayjs().subtract(2, 'month').format('YYYY-MM-DD'), notes: null, recurring_id: null, created_at: '' } as any,
    ]);

    const result = await getSalaryProjection(db);

    expect(result!.amount).toBe(5000000);
  });
});

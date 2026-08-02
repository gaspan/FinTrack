import dayjs from 'dayjs';
import { calculateSafeToSpend, generateForecast } from '@/features/forecast/forecastEngine';
import { WalletQueries, RecurringQueries, TransactionQueries, SavingsGoalQueries, BillReminderQueries, SubscriptionQueries } from '@/lib/queries';
import { getSalaryProjection } from '@/utils/salary';

jest.mock('@/utils/salary', () => ({
  getSalaryProjection: jest.fn(),
}));

const salaryMock = getSalaryProjection as jest.MockedFunction<typeof getSalaryProjection>;

const db = {} as any;

const walletGetAllSpy = jest.spyOn(WalletQueries.prototype, 'getAll');
const recurringGetActiveSpy = jest.spyOn(RecurringQueries.prototype, 'getActive');
const txGetByDateRangeSpy = jest.spyOn(TransactionQueries.prototype, 'getByDateRange');
const subUpcomingSpy = jest.spyOn(SubscriptionQueries.prototype, 'getUpcomingRenewals');
const reminderGetAllSpy = jest.spyOn(BillReminderQueries.prototype, 'getAll');
const goalGetAllSpy = jest.spyOn(SavingsGoalQueries.prototype, 'getAll');

beforeEach(() => {
  jest.clearAllMocks();
  walletGetAllSpy.mockResolvedValue([{ id: 1, name: 'Kas', balance: 1000000, icon: null, color: null } as any]);
  recurringGetActiveSpy.mockResolvedValue([]);
  txGetByDateRangeSpy.mockResolvedValue([]);
  subUpcomingSpy.mockResolvedValue([]);
  reminderGetAllSpy.mockResolvedValue([]);
  goalGetAllSpy.mockResolvedValue([]);
  salaryMock.mockResolvedValue(null);
});

describe('generateForecast', () => {
  it('memasukkan estimasi gaji di tanggal gaji berikutnya (tanpa recurring income)', async () => {
    const salaryDate = dayjs().add(10, 'day').format('YYYY-MM-DD');
    salaryMock.mockResolvedValue({ amount: 5000000, nextDate: salaryDate, salaryDay: 25, salaryCategoryId: 1 });

    const points = await generateForecast(db, 20);

    const atSalaryDay = points.find(p => p.date === salaryDate)!;
    expect(atSalaryDay.income).toBe(5000000);
    expect(atSalaryDay.projected_balance).toBe(1000000 + 5000000);

    const beforeSalary = points.find(p => dayjs(p.date).isBefore(dayjs(salaryDate)))!;
    expect(beforeSalary.income).toBe(0);
  });

  it('tidak double-counting: gaji tidak di-inject jika recurring income sudah aktif', async () => {
    const salaryDate = dayjs().add(10, 'day').format('YYYY-MM-DD');
    salaryMock.mockResolvedValue({ amount: 5000000, nextDate: salaryDate, salaryDay: 25, salaryCategoryId: 1 });
    recurringGetActiveSpy.mockResolvedValue([
      { id: 1, type: 'income', amount: 3000000, category_id: 1, wallet_id: 1, frequency: 'monthly', next_date: salaryDate, notes: null, is_active: 1 } as any,
    ]);

    const points = await generateForecast(db, 20);

    const atSalaryDay = points.find(p => p.date === salaryDate)!;
    expect(atSalaryDay.income).toBe(3000000);
  });

  it('tetap memproses recurring expense biasa', async () => {
    const expenseDate = dayjs().add(5, 'day').format('YYYY-MM-DD');
    recurringGetActiveSpy.mockResolvedValue([
      { id: 2, type: 'expense', amount: 50000, category_id: 2, wallet_id: 1, frequency: 'monthly', next_date: expenseDate, notes: null, is_active: 1 } as any,
    ]);

    const points = await generateForecast(db, 15);

    const atExpenseDay = points.find(p => p.date === expenseDate)!;
    expect(atExpenseDay.expense).toBe(50000);
  });
});

describe('calculateSafeToSpend', () => {
  it('memperhitungkan gaji yang akan datang di bulan yang sama', async () => {
    salaryMock.mockResolvedValue({
      amount: 5000000,
      nextDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
      salaryDay: 25,
      salaryCategoryId: 1,
    });

    const result = await calculateSafeToSpend(db);

    expect(result).not.toBeNull();
    expect(result!.remainingBalance).toBe(1000000 + 5000000);
  });

  it('mengabaikan gaji jika tanggalnya di luar bulan berjalan', async () => {
    salaryMock.mockResolvedValue({
      amount: 5000000,
      nextDate: dayjs().add(40, 'day').format('YYYY-MM-DD'),
      salaryDay: 25,
      salaryCategoryId: 1,
    });

    const result = await calculateSafeToSpend(db);

    expect(result!.remainingBalance).toBe(1000000);
  });

  it('mengembalikan null jika tidak ada dompet', async () => {
    walletGetAllSpy.mockResolvedValue([]);

    const result = await calculateSafeToSpend(db);

    expect(result).toBeNull();
  });
});

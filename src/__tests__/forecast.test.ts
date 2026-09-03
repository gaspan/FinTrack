import dayjs from 'dayjs';
import { calculateSafeToSpend, generateForecast } from '@/features/forecast/forecastEngine';
import { WalletQueries, RecurringQueries, TransactionQueries, SavingsGoalQueries, BillReminderQueries, SubscriptionQueries, DebtQueries } from '@/lib/queries';
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
const subGetAllSpy = jest.spyOn(SubscriptionQueries.prototype, 'getAll');
const reminderGetAllSpy = jest.spyOn(BillReminderQueries.prototype, 'getAll');
const goalGetAllSpy = jest.spyOn(SavingsGoalQueries.prototype, 'getAll');
const debtGetAllSpy = jest.spyOn(DebtQueries.prototype, 'getAll');

beforeEach(() => {
  jest.clearAllMocks();
  walletGetAllSpy.mockResolvedValue([{ id: 1, name: 'Kas', balance: 1000000, icon: null, color: null } as any]);
  recurringGetActiveSpy.mockResolvedValue([]);
  txGetByDateRangeSpy.mockResolvedValue([]);
  subUpcomingSpy.mockResolvedValue([]);
  subGetAllSpy.mockResolvedValue([]);
  reminderGetAllSpy.mockResolvedValue([]);
  goalGetAllSpy.mockResolvedValue([]);
  debtGetAllSpy.mockResolvedValue([]);
  salaryMock.mockResolvedValue(null);
});

describe('generateForecast', () => {
  it('memasukkan estimasi gaji di tanggal gaji berikutnya (tanpa recurring income)', async () => {
    const salaryDate = dayjs().add(10, 'day').format('YYYY-MM-DD');
    salaryMock.mockResolvedValue({ amount: 5000000, nextDate: salaryDate, salaryDay: 25, salaryCategoryId: 1 });

    const points = await generateForecast(db, 20, 1);

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

    const points = await generateForecast(db, 20, 1);

    const atSalaryDay = points.find(p => p.date === salaryDate)!;
    expect(atSalaryDay.income).toBe(3000000);
  });

  it('tetap memproses recurring expense biasa', async () => {
    const expenseDate = dayjs().add(5, 'day').format('YYYY-MM-DD');
    recurringGetActiveSpy.mockResolvedValue([
      { id: 2, type: 'expense', amount: 50000, category_id: 2, wallet_id: 1, frequency: 'monthly', next_date: expenseDate, notes: null, is_active: 1 } as any,
    ]);

    const points = await generateForecast(db, 15, 1);

    const atExpenseDay = points.find(p => p.date === expenseDate)!;
    expect(atExpenseDay.expense).toBe(50000);
  });
});

describe('generateForecast — kewajiban terjadwal', () => {
  it('memasukkan tagihan yang belum lunas pada tanggal jatuh tempo', async () => {
    const billDate = dayjs().add(4, 'day').format('YYYY-MM-DD');
    reminderGetAllSpy.mockResolvedValue([{
      id: 1, name: 'Listrik', amount: 350000, due_date: billDate,
      frequency: 'monthly', is_paid: 0, category_id: 5, wallet_id: 2,
      notes: null, paid_transaction_id: null, book_id: 1,
    } as any]);

    const points = await generateForecast(db, 20, 1);

    const atBill = points.find(p => p.date === billDate)!;
    expect(atBill.expense).toBe(350000);
  });

  it('mengabaikan tagihan yang sudah lunas', async () => {
    reminderGetAllSpy.mockResolvedValue([{
      id: 1, name: 'Listrik', amount: 350000, due_date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
      frequency: 'one_time', is_paid: 1, category_id: 5, wallet_id: 2,
      notes: null, paid_transaction_id: 99, book_id: 1,
    } as any]);

    const points = await generateForecast(db, 10, 1);
    expect(points.some(p => p.expense > 0)).toBe(false);
  });

  it('memasukkan langganan aktif pada siklus berikutnya', async () => {
    const nextBilling = dayjs().add(6, 'day').format('YYYY-MM-DD');
    subGetAllSpy.mockResolvedValue([{
      id: 1, name: 'Netflix', amount: 186000, billing_cycle: 'monthly',
      next_billing_date: nextBilling, is_active: 1, auto_create: 1,
      wallet_id: 2, category_id: 5, book_id: 1,
    } as any]);

    const points = await generateForecast(db, 30, 1);

    const atBilling = points.find(p => p.date === nextBilling)!;
    expect(atBilling.expense).toBe(186000);
  });

  it('debt dengan jatuh tempo hanya informasional dan tidak mengubah saldo proyeksi', async () => {
    const due = dayjs().add(5, 'day').format('YYYY-MM-DD');
    debtGetAllSpy.mockResolvedValue([{
      id: 1, person_name: 'Budi', direction: 'receivable', amount: 1000000,
      paid_amount: 0, due_date: due, wallet_id: 2, is_settled: 0, book_id: 1,
    } as any]);

    const points = await generateForecast(db, 15, 1);

    const atDue = points.find(p => p.date === due)!;
    expect(atDue.income).toBe(0);
    expect(atDue.projected_balance).toBe(1000000);
    const debtEvent = atDue.events?.find(e => e.source === 'debt');
    expect(debtEvent?.affectsBalance).toBe(false);
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

    const result = await calculateSafeToSpend(db, 1);

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

    const result = await calculateSafeToSpend(db, 1);

    expect(result!.remainingBalance).toBe(1000000);
  });

  it('mengembalikan null jika tidak ada dompet', async () => {
    walletGetAllSpy.mockResolvedValue([]);

    const result = await calculateSafeToSpend(db, 1);

    expect(result).toBeNull();
  });
});

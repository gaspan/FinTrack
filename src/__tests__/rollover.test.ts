import dayjs from 'dayjs';
import { RolloverEngine } from '@/features/rollover/rolloverEngine';
import { BudgetQueries } from '@/lib/queries';

const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
const currentMonth = dayjs().format('YYYY-MM');

const db = {
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};

const getByMonthSpy = jest.spyOn(BudgetQueries.prototype, 'getByMonth');
const getByCategoryMonthSpy = jest.spyOn(BudgetQueries.prototype, 'getByCategoryMonth');
const setBudgetSpy = jest.spyOn(BudgetQueries.prototype, 'setBudget');

beforeEach(() => {
  jest.clearAllMocks();
  getByMonthSpy.mockResolvedValue([]);
  getByCategoryMonthSpy.mockResolvedValue(null);
  setBudgetSpy.mockResolvedValue();
});

const makePrevBudget = (overrides: Partial<any> = {}) => ({
  id: 1,
  category_id: 1,
  monthly_limit: 1000000,
  month: prevMonth,
  rollover_amount: 0,
  rollover_enabled: 1,
  spent: 600000,
  category_name: 'Makanan',
  color: '#FF6B6B',
  ...overrides,
});

describe('RolloverEngine', () => {
  it('meneruskan sisa anggaran (limit - spent) ke bulan berjalan', async () => {
    getByMonthSpy.mockResolvedValue([makePrevBudget()]);

    await new RolloverEngine(db as any).process();

    expect(setBudgetSpy).toHaveBeenCalledWith(1, 1000000, currentMonth, true);
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE budgets SET rollover_amount = ? WHERE category_id = ? AND month = ?',
      [400000, 1, currentMonth]
    );
  });

  it('tidak meneruskan sisa negatif jika anggaran habis terpakai', async () => {
    getByMonthSpy.mockResolvedValue([makePrevBudget({ spent: 1500000 })]);

    await new RolloverEngine(db as any).process();

    expect(setBudgetSpy).toHaveBeenCalledWith(1, 1000000, currentMonth, true);
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE budgets SET rollover_amount = ? WHERE category_id = ? AND month = ?',
      [0, 1, currentMonth]
    );
  });

  it('menjaga monthly_limit yang sudah di-set di bulan berjalan', async () => {
    getByMonthSpy.mockResolvedValue([makePrevBudget()]);
    getByCategoryMonthSpy.mockResolvedValue({
      id: 9, category_id: 1, monthly_limit: 2000000, month: currentMonth,
      rollover_amount: 0, rollover_enabled: 1,
    });

    await new RolloverEngine(db as any).process();

    expect(setBudgetSpy).toHaveBeenCalledWith(1, 2000000, currentMonth, true);
  });

  it('menghapus rollover_amount jika rollover dinonaktifkan bulan ini', async () => {
    getByMonthSpy.mockResolvedValue([makePrevBudget({ rollover_enabled: 0 })]);
    getByCategoryMonthSpy.mockResolvedValue({
      id: 9, category_id: 1, monthly_limit: 1000000, month: currentMonth,
      rollover_amount: 300000, rollover_enabled: 0,
    });

    await new RolloverEngine(db as any).process();

    expect(setBudgetSpy).not.toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE budgets SET rollover_amount = 0 WHERE category_id = ? AND month = ?',
      [1, currentMonth]
    );
  });

  it('tidak melakukan apa pun jika tidak ada budget bulan lalu', async () => {
    await new RolloverEngine(db as any).process();

    expect(setBudgetSpy).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});

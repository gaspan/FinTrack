import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionQueries } from '@/lib/queries';
import { findSalaryCategoryId, getSalaryDate } from '@/utils/payroll';

export const PAYROLL_ENABLED_KEY = 'payroll_enabled';
export const PAYROLL_DAY_KEY = 'payroll_day';
export const PAYROLL_CATEGORY_KEY = 'payroll_category_id';

export interface SalaryProjection {
  amount: number;
  nextDate: string;
  salaryDay: number;
  salaryCategoryId: number;
}

export async function getSalaryProjection(db: SQLiteDatabase): Promise<SalaryProjection | null> {
  const [enabledRaw, dayRaw, catRaw] = await Promise.all([
    AsyncStorage.getItem(PAYROLL_ENABLED_KEY),
    AsyncStorage.getItem(PAYROLL_DAY_KEY),
    AsyncStorage.getItem(PAYROLL_CATEGORY_KEY),
  ]);
  if (enabledRaw === 'false') return null;

  const salaryDay = dayRaw ? parseInt(dayRaw, 10) : 25;
  const salaryCategoryId = await findSalaryCategoryId(db, catRaw ? parseInt(catRaw, 10) : null);
  if (!salaryCategoryId) return null;

  const txQueries = new TransactionQueries(db);
  const txs = await txQueries.getByDateRange(
    dayjs().subtract(3, 'month').startOf('month').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  );
  const salaries = txs.filter(t => t.category_id === salaryCategoryId && t.type === 'income');
  if (salaries.length === 0) return null;

  const amount = salaries.reduce((s, t) => s + t.amount, 0) / salaries.length;

  const today = dayjs();
  let next = getSalaryDate(today.year(), today.month(), salaryDay);
  if (next.isBefore(today, 'day')) {
    next = getSalaryDate(today.year(), today.month() + 1, salaryDay);
  }

  return { amount, nextDate: next.format('YYYY-MM-DD'), salaryDay, salaryCategoryId };
}

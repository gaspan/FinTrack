import dayjs from 'dayjs';
import { SQLiteDatabase } from 'expo-sqlite';

export interface PayrollPeriod {
  startDate: string;
  endDate: string;
  label: string;
  isBasedOnActualSalary: boolean;
}

const SALARY_CATEGORY_NAME = 'Gaji';

export function getSalaryDate(year: number, month: number, day: number): dayjs.Dayjs {
  const candidate = dayjs().year(year).month(month).date(day).startOf('day');
  if (candidate.month() !== month) {
    return dayjs().year(year).month(month).endOf('month').startOf('day');
  }
  return candidate;
}

export async function findSalaryCategoryId(
  db: SQLiteDatabase,
  bookId: number,
  preferredCategoryId?: number | null
): Promise<number | null> {
  if (preferredCategoryId) {
    const exists = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE id = ? AND book_id = ? AND type = ?',
      [preferredCategoryId, bookId, 'income']
    );
    if (exists) return exists.id;
  }

  const byName = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE book_id = ? AND name = ? AND type = ?',
    [bookId, SALARY_CATEGORY_NAME, 'income']
  );
  if (byName) return byName.id;

  const firstIncome = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE book_id = ? AND type = ? ORDER BY sort_order ASC LIMIT 1',
    [bookId, 'income']
  );
  return firstIncome?.id ?? null;
}

export async function getLastSalaryDate(
  db: SQLiteDatabase,
  salaryCategoryId: number,
  beforeOrOn: string,
  bookId: number
): Promise<string | null> {
  const row = await db.getFirstAsync<{ transaction_date: string }>(
    `SELECT transaction_date FROM transactions
     WHERE book_id = ? AND category_id = ? AND type = ? AND transaction_date <= ?
     ORDER BY transaction_date DESC, created_at DESC LIMIT 1`,
    [bookId, salaryCategoryId, 'income', beforeOrOn]
  );
  return row?.transaction_date ?? null;
}

export async function getNextSalaryDate(
  db: SQLiteDatabase,
  salaryCategoryId: number,
  after: string,
  bookId: number
): Promise<string | null> {
  const row = await db.getFirstAsync<{ transaction_date: string }>(
    `SELECT transaction_date FROM transactions
     WHERE book_id = ? AND category_id = ? AND type = ? AND transaction_date > ?
     ORDER BY transaction_date ASC, created_at ASC LIMIT 1`,
    [bookId, salaryCategoryId, 'income', after]
  );
  return row?.transaction_date ?? null;
}

export function getDefaultPayrollPeriod(salaryDay: number, referenceDate: dayjs.Dayjs = dayjs()): PayrollPeriod {
  const ref = referenceDate.startOf('day');
  const currentMonthSalary = getSalaryDate(ref.year(), ref.month(), salaryDay);

  let startDate: dayjs.Dayjs;
  if (ref.isSame(currentMonthSalary) || ref.isAfter(currentMonthSalary)) {
    startDate = currentMonthSalary;
  } else {
    startDate = getSalaryDate(ref.year(), ref.month() - 1, salaryDay);
  }

  const endDate = startDate.add(1, 'month').subtract(1, 'day');

  return {
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: endDate.format('YYYY-MM-DD'),
    label: `${startDate.format('DD MMM')} – ${endDate.format('DD MMM YYYY')}`,
    isBasedOnActualSalary: false,
  };
}

export async function getPayrollPeriod(
  db: SQLiteDatabase,
  salaryDay: number,
  salaryCategoryId: number,
  referenceDate: dayjs.Dayjs = dayjs(),
  bookId = 1
): Promise<PayrollPeriod> {
  const ref = referenceDate.startOf('day');
  const defaultPeriod = getDefaultPayrollPeriod(salaryDay, ref);

  const lastSalary = await getLastSalaryDate(db, salaryCategoryId, ref.format('YYYY-MM-DD'), bookId);
  const nextSalary = await getNextSalaryDate(db, salaryCategoryId, ref.format('YYYY-MM-DD'), bookId);

  let startDate = defaultPeriod.startDate;
  let endDate = defaultPeriod.endDate;
  let isBasedOnActualSalary = false;

  if (lastSalary) {
    startDate = lastSalary;
    isBasedOnActualSalary = true;
  }

  if (nextSalary) {
    endDate = dayjs(nextSalary).subtract(1, 'day').format('YYYY-MM-DD');
    isBasedOnActualSalary = true;
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  return {
    startDate,
    endDate,
    label: `${start.format('DD MMM')} – ${end.format('DD MMM YYYY')}`,
    isBasedOnActualSalary,
  };
}

export async function getPreviousPayrollPeriod(
  db: SQLiteDatabase,
  salaryDay: number,
  salaryCategoryId: number,
  currentStartDate: string,
  bookId = 1
): Promise<PayrollPeriod> {
  const start = dayjs(currentStartDate).subtract(1, 'day').startOf('day');

  const lastSalary = await getLastSalaryDate(db, salaryCategoryId, start.format('YYYY-MM-DD'), bookId);

  let prevStart: dayjs.Dayjs;
  if (lastSalary) {
    prevStart = dayjs(lastSalary);
  } else {
    const currentMonthSalary = getSalaryDate(start.year(), start.month(), salaryDay);
    prevStart = start.isSame(currentMonthSalary) || start.isAfter(currentMonthSalary)
      ? getSalaryDate(start.year(), start.month() - 1, salaryDay)
      : getSalaryDate(start.year(), start.month() - 2, salaryDay);
  }

  const prevEnd = start;

  return {
    startDate: prevStart.format('YYYY-MM-DD'),
    endDate: prevEnd.format('YYYY-MM-DD'),
    label: `${prevStart.format('DD MMM')} – ${prevEnd.format('DD MMM YYYY')}`,
    isBasedOnActualSalary: !!lastSalary,
  };
}



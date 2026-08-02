import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { SafeToSpendData, ForecastPoint } from '@/types';
import { WalletQueries, TransactionQueries, RecurringQueries, SavingsGoalQueries, BillReminderQueries, SubscriptionQueries } from '@/lib/queries';
import { getSalaryProjection } from '@/utils/salary';

export async function calculateSafeToSpend(db: SQLiteDatabase): Promise<SafeToSpendData | null> {
  const today = dayjs();
  const endOfMonth = today.endOf('month');
  const daysRemaining = endOfMonth.diff(today, 'day');

  const walletQueries = new WalletQueries(db);
  const wallets = await walletQueries.getAll();
  if (wallets.length === 0) return null;
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const subQueries = new SubscriptionQueries(db);
  const recurringQueries = new RecurringQueries(db);
  const reminderQueries = new BillReminderQueries(db);
  const goalQueries = new SavingsGoalQueries(db);

  const [upcomingSubs, allRecurring, allReminders, goals, salary] = await Promise.all([
    subQueries.getUpcomingRenewals(daysRemaining),
    recurringQueries.getActive(),
    reminderQueries.getAll(),
    goalQueries.getAll(),
    getSalaryProjection(db).catch(() => null),
  ]);

  const upcomingBills =
    allRecurring.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0) +
    upcomingSubs.reduce((s, r) => s + r.amount, 0) +
    allReminders.filter(r => !r.is_paid && r.due_date <= endOfMonth.format('YYYY-MM-DD')).reduce((s, r) => s + r.amount, 0);

  const upcomingIncome = salary && salary.nextDate <= endOfMonth.format('YYYY-MM-DD') ? salary.amount : 0;

  const savingsTarget = goals
    .filter(g => !g.is_completed)
    .reduce((sum, g) => {
      const remaining = g.target_amount - g.current_amount;
      if (remaining <= 0) return sum;
      const daysToDeadline = g.deadline
        ? Math.max(dayjs(g.deadline).diff(today, 'day'), 1)
        : 30;
      return sum + (remaining / daysToDeadline) * daysRemaining;
    }, 0);

  const effectiveBalance = totalBalance + upcomingIncome;
  const remainingBalance = Math.max(0, effectiveBalance - upcomingBills - savingsTarget);
  const safeToSpend = remainingBalance;
  const safeToSpendDaily = daysRemaining > 0 ? safeToSpend / daysRemaining : safeToSpend;

  let status: SafeToSpendData['status'] = 'healthy';
  let color = '#10B981';
  if (effectiveBalance > 0) {
    if (safeToSpend < effectiveBalance * 0.1) {
      status = 'danger';
      color = '#EF4444';
    } else if (safeToSpend < effectiveBalance * 0.3) {
      status = 'caution';
      color = '#F59E0B';
    }
  }

  return {
    safeToSpend, safeToSpendDaily, totalBalance,
    upcomingBills, savingsTarget, remainingBalance,
    daysRemaining, color, status,
  };
}

export async function generateForecast(db: SQLiteDatabase, days: number = 30): Promise<ForecastPoint[]> {
  const today = dayjs();
  const points: ForecastPoint[] = [];

  const walletQueries = new WalletQueries(db);
  const wallets = await walletQueries.getAll();
  let currentBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const recurringQueries = new RecurringQueries(db);
  const [allRecurring, salary] = await Promise.all([
    recurringQueries.getActive(),
    getSalaryProjection(db).catch(() => null),
  ]);
  const hasRecurringIncome = allRecurring.some(r => r.type === 'income' && r.is_active === 1);

  const txQueries = new TransactionQueries(db);
  const last30Days = await txQueries.getByDateRange(
    today.subtract(30, 'day').format('YYYY-MM-DD'),
    today.format('YYYY-MM-DD')
  );
  const avgDailyExpense = last30Days.length > 0
    ? last30Days.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / 30
    : 0;

  for (let i = 0; i < days; i++) {
    const date = today.add(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');

    let income = 0;
    let expense = avgDailyExpense;

    if (salary && !hasRecurringIncome && dateStr === salary.nextDate) {
      income += salary.amount;
    }

    for (const rec of allRecurring) {
      const start = dayjs(rec.next_date);
      if (date.isBefore(start)) continue;
      const daysDiff = date.diff(start, 'day');
      let shouldOccur = false;

      switch (rec.frequency) {
        case 'daily': shouldOccur = true; break;
        case 'weekly': shouldOccur = daysDiff % 7 === 0; break;
        case 'monthly': shouldOccur = date.date() === start.date(); break;
        case 'yearly': shouldOccur = date.format('MM-DD') === start.format('MM-DD'); break;
      }

      if (shouldOccur) {
        if (rec.type === 'income') income += rec.amount;
        else expense += rec.amount;
      }
    }

    currentBalance = currentBalance + income - expense;
    points.push({ date: dateStr, projected_balance: currentBalance, income, expense });
  }

  return points;
}
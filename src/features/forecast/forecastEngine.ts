import { SQLiteDatabase } from 'expo-sqlite';
import dayjs, { Dayjs } from 'dayjs';
import { SafeToSpendData, ForecastPoint, Transaction } from '@/types';
import {
  BillReminderQueries,
  DebtQueries,
  RecurringQueries,
  SavingsGoalQueries,
  SubscriptionQueries,
  TransactionQueries,
  WalletQueries,
} from '@/lib/queries';
import { getSalaryProjection } from '@/utils/salary';
import {
  buildForecastEvents,
  ForecastSources,
  getSavingsReservation,
} from './forecastEvents';

interface ForecastData extends ForecastSources {
  totalBalance: number;
  hasWallets: boolean;
  averageDailyExpense: number;
}

function isScheduledExpenseSource(source: string): boolean {
  return source === 'recurring' || source === 'bill' || source === 'subscription';
}

function isKnownScheduledExpense(tx: Transaction): boolean {
  return Boolean(
    tx.recurring_id
    || tx.source_key?.startsWith('bill:')
    || tx.source_key?.startsWith('subscription:')
    || tx.notes?.startsWith('Tagihan ')
    || tx.notes?.startsWith('Langganan ')
  );
}

async function loadForecastData(
  db: SQLiteDatabase,
  bookId: number,
  rangeStart: Dayjs,
  rangeEnd: Dayjs
): Promise<ForecastData> {
  const walletQueries = new WalletQueries(db, bookId);
  const transactionQueries = new TransactionQueries(db, bookId);
  const [wallets, recurring, salary, bills, subscriptions, debts, goals, actualTransactions, history] = await Promise.all([
    walletQueries.getAll(),
    new RecurringQueries(db, bookId).getActive(),
    getSalaryProjection(db, bookId).catch(() => null),
    new BillReminderQueries(db, bookId).getAll(),
    new SubscriptionQueries(db, bookId).getAll(),
    new DebtQueries(db, bookId).getAll(false),
    new SavingsGoalQueries(db, bookId).getAll(),
    transactionQueries.getByDateRange(rangeStart.format('YYYY-MM-DD'), rangeEnd.format('YYYY-MM-DD')),
    transactionQueries.getByDateRange(
      rangeStart.subtract(30, 'day').format('YYYY-MM-DD'),
      rangeStart.subtract(1, 'day').format('YYYY-MM-DD'),
      false
    ),
  ]);

  const variableExpenses = history.filter(tx =>
    tx.type === 'expense' && !isKnownScheduledExpense(tx) && tx.is_internal !== 1
  );
  const averageDailyExpense = variableExpenses.reduce((sum, tx) => sum + tx.amount, 0) / 30;

  return {
    recurring,
    salary,
    bills,
    subscriptions,
    debts,
    goals,
    actualTransactions,
    totalBalance: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    hasWallets: wallets.length > 0,
    averageDailyExpense,
  };
}

export async function calculateSafeToSpend(db: SQLiteDatabase, bookId: number): Promise<SafeToSpendData | null> {
  const today = dayjs().startOf('day');
  const endOfMonth = today.endOf('month').startOf('day');
  const daysRemaining = endOfMonth.diff(today, 'day') + 1;
  const data = await loadForecastData(db, bookId, today, endOfMonth);
  if (!data.hasWallets) return null;

  const events = buildForecastEvents(data, today.format('YYYY-MM-DD'), daysRemaining, {
    averageDailyExpense: data.averageDailyExpense,
  });
  const upcomingIncome = events
    .filter(item => item.cashImpact > 0)
    .reduce((sum, item) => sum + item.cashImpact, 0);
  const upcomingBills = events
    .filter(item => item.cashImpact < 0 && isScheduledExpenseSource(item.source))
    .reduce((sum, item) => sum - item.cashImpact, 0);
  const estimatedVariableSpending = events
    .filter(item => item.source === 'baseline')
    .reduce((sum, item) => sum - item.cashImpact, 0);
  const savingsTarget = getSavingsReservation(data.goals, today, endOfMonth);

  const effectiveBalance = data.totalBalance + upcomingIncome;
  const remainingBalance = Math.max(0, effectiveBalance - upcomingBills - estimatedVariableSpending - savingsTarget);
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
    safeToSpend,
    safeToSpendDaily,
    totalBalance: data.totalBalance,
    upcomingBills,
    savingsTarget,
    remainingBalance,
    daysRemaining,
    color,
    status,
  };
}

export async function generateForecast(db: SQLiteDatabase, days: number = 30, bookId: number = 1): Promise<ForecastPoint[]> {
  if (days <= 0) return [];
  const today = dayjs().startOf('day');
  const end = today.add(days - 1, 'day');
  const data = await loadForecastData(db, bookId, today, end);
  const events = buildForecastEvents(data, today.format('YYYY-MM-DD'), days, {
    averageDailyExpense: data.averageDailyExpense,
  });
  const eventsByDate = events.reduce((groups, item) => {
    if (!item.date) return groups;
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
    return groups;
  }, {} as Record<string, typeof events>);

  let currentBalance = data.totalBalance;
  const points: ForecastPoint[] = [];
  for (let index = 0; index < days; index++) {
    const date = today.add(index, 'day').format('YYYY-MM-DD');
    const dayEvents = eventsByDate[date] || [];
    const income = dayEvents
      .filter(item => item.cashImpact > 0)
      .reduce((sum, item) => sum + item.cashImpact, 0);
    const expense = dayEvents
      .filter(item => item.cashImpact < 0)
      .reduce((sum, item) => sum - item.cashImpact, 0);
    currentBalance += income - expense;
    points.push({ date, projected_balance: currentBalance, income, expense, events: dayEvents });
  }
  return points;
}

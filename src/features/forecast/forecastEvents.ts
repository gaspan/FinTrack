import dayjs, { Dayjs } from 'dayjs';
import {
  BillReminder,
  Debt,
  ForecastEvent,
  ForecastEventSource,
  RecurringTransaction,
  SavingsGoal,
  Subscription,
  Transaction,
} from '@/types';
import { SalaryProjection } from '@/utils/salary';
import { addRecurrence, expandRecurrence, remainingDaysInclusive } from '@/utils/recurrence';

export type ForecastTransaction = Pick<Transaction, 'transaction_date' | 'type' | 'amount' | 'category_id' | 'recurring_id' | 'source_key' | 'notes'>;

export interface ForecastSources {
  recurring: RecurringTransaction[];
  salary: SalaryProjection | null;
  bills: BillReminder[];
  subscriptions: Subscription[];
  debts: Debt[];
  goals: SavingsGoal[];
  actualTransactions: ForecastTransaction[];
}

export interface ForecastEventOptions {
  averageDailyExpense?: number;
}

function event(
  source: ForecastEventSource,
  sourceId: number | null,
  keyDate: string,
  date: string | null,
  amount: number,
  direction: ForecastEvent['direction'],
  label: string,
  status: ForecastEvent['status'] = 'scheduled',
  walletId?: number | null,
  categoryId?: number | null
): ForecastEvent {
  const cashImpact = direction === 'income' ? amount : direction === 'expense' ? -amount : 0;
  return {
    key: `${source}:${sourceId ?? 'none'}:${keyDate}`,
    source,
    sourceId,
    date,
    amount,
    direction,
    cashImpact,
    affectsBalance: cashImpact !== 0,
    status,
    label,
    walletId,
    categoryId,
  };
}

function actualMatches(eventItem: ForecastEvent, actualTransactions: ForecastTransaction[]): boolean {
  return actualTransactions.some(tx => {
    if (tx.source_key === eventItem.key) return true;
    if (eventItem.source === 'recurring' && tx.recurring_id === eventItem.sourceId && tx.transaction_date === eventItem.date) {
      return true;
    }
    if (!eventItem.date || tx.transaction_date !== eventItem.date) return false;
    if (eventItem.source === 'salary') {
      return tx.type === 'income' && tx.category_id === eventItem.categoryId;
    }
    if (eventItem.source === 'bill') return tx.notes === `Tagihan ${eventItem.label}`;
    if (eventItem.source === 'subscription') return tx.notes === `Langganan ${eventItem.label}`;
    return false;
  });
}

function eventDateForDueDate(dueDate: string, start: Dayjs, end: Dayjs): { date: string; status: ForecastEvent['status'] } | null {
  const due = dayjs(dueDate).startOf('day');
  if (!due.isValid() || due.isAfter(end, 'day')) return null;
  if (due.isBefore(start, 'day')) return { date: start.format('YYYY-MM-DD'), status: 'overdue' };
  return { date: due.format('YYYY-MM-DD'), status: 'scheduled' };
}

export function buildForecastEvents(
  sources: ForecastSources,
  rangeStart: string,
  days: number,
  options: ForecastEventOptions = {}
): ForecastEvent[] {
  if (days <= 0) return [];
  const start = dayjs(rangeStart).startOf('day');
  const end = start.add(days - 1, 'day');
  if (!start.isValid()) return [];
  const events: ForecastEvent[] = [];

  for (const recurring of sources.recurring) {
    if (!recurring.is_active || recurring.amount <= 0) continue;
    for (const date of expandRecurrence(recurring.next_date, recurring.frequency, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'))) {
      events.push(event(
        'recurring',
        recurring.id,
        date,
        date,
        recurring.amount,
        recurring.type,
        recurring.notes || 'Transaksi berulang',
        'scheduled',
        recurring.wallet_id,
        recurring.category_id
      ));
    }
  }

  if (sources.salary && sources.salary.amount > 0) {
    const recurringIncomeDates = new Set<string>();
    for (const recurring of sources.recurring) {
      if (!recurring.is_active || recurring.type !== 'income' || recurring.amount <= 0) continue;
      for (const date of expandRecurrence(recurring.next_date, recurring.frequency, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'))) {
        recurringIncomeDates.add(`${recurring.category_id}|${date}`);
      }
    }
    for (const date of expandRecurrence(sources.salary.nextDate, 'monthly', start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'))) {
      if (sources.salary.salaryCategoryId != null && recurringIncomeDates.has(`${sources.salary.salaryCategoryId}|${date}`)) {
        continue;
      }
      events.push(event(
        'salary',
        sources.salary.salaryCategoryId,
        date,
        date,
        sources.salary.amount,
        'income',
        'Gaji',
        'scheduled',
        null,
        sources.salary.salaryCategoryId
      ));
    }
  }

  for (const bill of sources.bills) {
    if (bill.is_paid || bill.amount <= 0) continue;
    const due = eventDateForDueDate(bill.due_date, start, end);
    if (!due) continue;
    events.push(event(
      'bill',
      bill.id,
      bill.due_date,
      due.date,
      bill.amount,
      'expense',
      bill.name,
      due.status,
      bill.wallet_id,
      bill.category_id
    ));
  }

  for (const subscription of sources.subscriptions) {
    if (!subscription.is_active || subscription.amount <= 0) continue;
    const frequency = subscription.billing_cycle === 'yearly' ? 'yearly' : subscription.billing_cycle === 'quarterly' ? 'quarterly' : 'monthly';
    for (const date of expandRecurrence(subscription.next_billing_date, frequency, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'))) {
      events.push(event(
        'subscription',
        subscription.id,
        date,
        date,
        subscription.amount,
        'expense',
        subscription.name,
        subscription.auto_create ? 'scheduled' : 'manual',
        subscription.wallet_id,
        subscription.category_id
      ));
    }
  }

  for (const debt of sources.debts) {
    const remaining = Math.max(0, debt.amount - debt.paid_amount);
    if (debt.is_settled || remaining <= 0 || !debt.due_date) continue;
    const due = eventDateForDueDate(debt.due_date, start, end);
    if (!due) continue;
    events.push(event(
      'debt',
      debt.id,
      debt.due_date,
      due.date,
      remaining,
      'informational',
      debt.direction === 'receivable' ? `Piutang ${debt.person_name}` : `Utang ${debt.person_name}`,
      'informational',
      debt.wallet_id
    ));
  }

  for (const goal of sources.goals) {
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    if (goal.is_completed || remaining <= 0 || !goal.deadline) continue;
    const due = eventDateForDueDate(goal.deadline, start, end);
    if (!due) continue;
    events.push(event(
      'savings_goal',
      goal.id,
      goal.deadline,
      due.date,
      remaining,
      'informational',
      `Target ${goal.name}`,
      'informational',
      goal.wallet_id
    ));
  }

  const averageDailyExpense = Math.max(0, options.averageDailyExpense || 0);
  if (averageDailyExpense > 0) {
    for (let index = 0; index < days; index++) {
      const date = start.add(index, 'day').format('YYYY-MM-DD');
      events.push(event('baseline', null, date, date, averageDailyExpense, 'expense', 'Rata-rata pengeluaran harian'));
    }
  }

  const unique = new Map<string, ForecastEvent>();
  for (const item of events) {
    if (!actualMatches(item, sources.actualTransactions)) unique.set(item.key, item);
  }
  return [...unique.values()].sort((a, b) => {
    if (a.date === b.date) return a.key.localeCompare(b.key);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

export function getSavingsReservation(
  goals: SavingsGoal[],
  today: Dayjs,
  periodEnd: Dayjs
): number {
  const daysRemaining = remainingDaysInclusive(today, periodEnd);
  if (daysRemaining === 0) return 0;
  return goals
    .filter(goal => !goal.is_completed)
    .reduce((sum, goal) => {
      const remaining = goal.target_amount - goal.current_amount;
      if (remaining <= 0) return sum;
      const daysToDeadline = goal.deadline
        ? Math.max(dayjs(goal.deadline).diff(today, 'day'), 1)
        : 30;
      return sum + (remaining / daysToDeadline) * daysRemaining;
    }, 0);
}

export function getNextRecurringDate(date: string, frequency: RecurringTransaction['frequency']): string {
  const current = dayjs(date);
  if (!current.isValid()) return date;
  return addRecurrence(current, frequency).format('YYYY-MM-DD');
}

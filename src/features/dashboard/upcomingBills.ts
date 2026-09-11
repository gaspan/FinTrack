import type { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';

import { RecurringQueries, BillReminderQueries, SubscriptionQueries } from '@/lib/queries';

export type UpcomingSource = 'recurring' | 'bill' | 'subscription';

export interface UpcomingItem {
  key: string;
  source: UpcomingSource;
  label: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  isOverdue: boolean;
  icon: string;
  color: string | null;
}

const DEFAULT_ICON: Record<UpcomingSource, string> = {
  recurring: 'sync-outline',
  bill: 'alarm-outline',
  subscription: 'card-outline',
};

/** Selisih hari kalender (bukan jam), negatif berarti sudah terlewat. */
export const daysUntil = (date: string, today = dayjs()): number =>
  dayjs(date).startOf('day').diff(today.startOf('day'), 'day');

export const formatDueLabel = (days: number): string => {
  if (days < 0) return `Terlewat ${Math.abs(days)} hari`;
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  return `${days} hari lagi`;
};

/**
 * Gabungkan recurring, tagihan, dan langganan yang jatuh tempo dalam `days` hari
 * menjadi satu daftar terurut. Hanya pengeluaran yang dihitung — pemasukan
 * berulang (gaji) bukan "tagihan".
 */
export async function loadUpcomingBills(
  db: SQLiteDatabase,
  bookId: number,
  days = 7
): Promise<UpcomingItem[]> {
  const [recurring, bills, subs] = await Promise.all([
    new RecurringQueries(db, bookId).getUpcoming(days),
    new BillReminderQueries(db, bookId).getUpcoming(days),
    new SubscriptionQueries(db, bookId).getUpcomingRenewals(days),
  ]);

  const items: UpcomingItem[] = [];

  for (const r of recurring) {
    if (r.type !== 'expense') continue;
    items.push({
      key: `recurring-${r.id}`,
      source: 'recurring',
      label: r.notes?.trim() || r.category_name,
      amount: r.amount,
      dueDate: r.next_date,
      daysUntil: daysUntil(r.next_date),
      isOverdue: daysUntil(r.next_date) < 0,
      icon: r.category_icon || DEFAULT_ICON.recurring,
      color: r.category_color ?? null,
    });
  }

  for (const b of bills) {
    items.push({
      key: `bill-${b.id}`,
      source: 'bill',
      label: b.name,
      amount: b.amount,
      dueDate: b.due_date,
      daysUntil: daysUntil(b.due_date),
      isOverdue: daysUntil(b.due_date) < 0,
      icon: DEFAULT_ICON.bill,
      color: null,
    });
  }

  for (const s of subs) {
    items.push({
      key: `subscription-${s.id}`,
      source: 'subscription',
      label: s.name,
      amount: s.amount,
      dueDate: s.next_billing_date,
      daysUntil: daysUntil(s.next_billing_date),
      isOverdue: daysUntil(s.next_billing_date) < 0,
      icon: DEFAULT_ICON.subscription,
      color: null,
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { RecurringQueries, insertTransactionWithBalance } from '@/lib/queries';
import type { Book } from '@/types';

export class RecurringEngine {
  constructor(private db: SQLiteDatabase, private books: Book[]) {}

  async processRecurringTransactions() {
    for (const book of this.books) {
      await this.processBook(book.id);
    }
  }

  private async processBook(bookId: number) {
    const recurringQueries = new RecurringQueries(this.db, bookId);
    const today = dayjs().format('YYYY-MM-DD');

    // 1. Get all active recurring transactions
    const activeRecurring = await recurringQueries.getActive();

    for (const rt of activeRecurring) {
      let nextDate = dayjs(rt.next_date);
      let count = 0;

      // 2. Loop in case it's overdue by multiple periods
      while (nextDate.isBefore(dayjs(today).add(1, 'day'), 'day') && count < 10) {
        const occurrenceDate = nextDate.format('YYYY-MM-DD');
        await insertTransactionWithBalance(this.db, bookId, {
          type: rt.type,
          amount: rt.amount,
          category_id: rt.category_id,
          wallet_id: rt.wallet_id,
          transaction_date: occurrenceDate,
          notes: rt.notes ? `${rt.notes} (Otomatis)` : 'Transaksi Rutin (Otomatis)',
          recurring_id: rt.id,
          source_key: `recurring:${rt.id}:${occurrenceDate}`,
        });

        // Calculate next date.
        if (rt.frequency === 'daily') {
          nextDate = nextDate.add(1, 'day');
        } else if (rt.frequency === 'weekly') {
          nextDate = nextDate.add(1, 'week');
        } else if (rt.frequency === 'monthly') {
          nextDate = nextDate.add(1, 'month');
        } else if (rt.frequency === 'yearly') {
          nextDate = nextDate.add(1, 'year');
        }

        count++;
      }

      // 5. Update next_date in DB if it changed
      if (nextDate.format('YYYY-MM-DD') !== rt.next_date) {
        await this.db.withTransactionAsync(async () => {
          await recurringQueries.updateNextDate(rt.id, nextDate.format('YYYY-MM-DD'));
        });
      }
    }
  }
}

import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { BudgetQueries } from '@/lib/queries';
import type { Book } from '@/types';

export class RolloverEngine {
  constructor(private db: SQLiteDatabase, private books: Book[]) {}

  async process() {
    for (const book of this.books) {
      await this.processBook(book.id);
    }
  }

  private async processBook(bookId: number) {
    const budgetQueries = new BudgetQueries(this.db, bookId);
    const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
    const currentMonth = dayjs().format('YYYY-MM');

    const prevBudgets = await budgetQueries.getByMonth(prevMonth);

    for (const b of prevBudgets) {
      const existing = await budgetQueries.getByCategoryMonth(b.category_id, currentMonth);

      if (b.rollover_enabled) {
        const unused = Math.max(0, b.monthly_limit - b.spent);
        await budgetQueries.setBudget(
          b.category_id,
          existing?.monthly_limit ?? b.monthly_limit,
          currentMonth,
          true
        );
        await this.db.runAsync(
          'UPDATE budgets SET rollover_amount = ? WHERE book_id = ? AND category_id = ? AND month = ?',
          [unused, bookId, b.category_id, currentMonth]
        );
      } else if (existing) {
        await this.db.runAsync(
          'UPDATE budgets SET rollover_amount = 0 WHERE book_id = ? AND category_id = ? AND month = ?',
          [bookId, b.category_id, currentMonth]
        );
      }
    }
  }
}

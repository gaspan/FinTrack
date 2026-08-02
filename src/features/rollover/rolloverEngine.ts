import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { BudgetQueries } from '@/lib/queries';

export class RolloverEngine {
  private budgetQueries: BudgetQueries;

  constructor(private db: SQLiteDatabase) {
    this.budgetQueries = new BudgetQueries(db);
  }

  async process() {
    const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
    const currentMonth = dayjs().format('YYYY-MM');

    const prevBudgets = await this.budgetQueries.getByMonth(prevMonth);

    for (const b of prevBudgets) {
      const existing = await this.budgetQueries.getByCategoryMonth(b.category_id, currentMonth);

      if (b.rollover_enabled) {
        const unused = Math.max(0, b.monthly_limit - b.spent);
        await this.budgetQueries.setBudget(
          b.category_id,
          existing?.monthly_limit ?? b.monthly_limit,
          currentMonth,
          true
        );
        await this.db.runAsync(
          'UPDATE budgets SET rollover_amount = ? WHERE category_id = ? AND month = ?',
          [unused, b.category_id, currentMonth]
        );
      } else if (existing) {
        await this.db.runAsync(
          'UPDATE budgets SET rollover_amount = 0 WHERE category_id = ? AND month = ?',
          [b.category_id, currentMonth]
        );
      }
    }
  }
}

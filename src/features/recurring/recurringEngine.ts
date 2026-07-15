import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { RecurringQueries, TransactionQueries } from '@/lib/queries';

export class RecurringEngine {
  private recurringQueries: RecurringQueries;
  private transactionQueries: TransactionQueries;

  constructor(private db: SQLiteDatabase) {
    this.recurringQueries = new RecurringQueries(db);
    this.transactionQueries = new TransactionQueries(db);
  }

  async processRecurringTransactions() {
    console.log('[RecurringEngine] Checking for due transactions...');
    const today = dayjs().format('YYYY-MM-DD');
    
    // 1. Get all active recurring transactions
    const activeRecurring = await this.recurringQueries.getActive();
    
    for (const rt of activeRecurring) {
      let nextDate = dayjs(rt.next_date);
      let count = 0;
      
      // 2. Loop in case it's overdue by multiple periods
      while (nextDate.isBefore(dayjs(today).add(1, 'day'), 'day') && count < 10) {
        console.log(`[RecurringEngine] Processing recurring ID ${rt.id} for date ${nextDate.format('YYYY-MM-DD')}`);
        
        // 3. Create the transaction
        await this.transactionQueries.create({
          type: rt.type,
          amount: rt.amount,
          category_id: rt.category_id,
          wallet_id: rt.wallet_id,
          transaction_date: nextDate.format('YYYY-MM-DD'),
          notes: rt.notes ? `${rt.notes} (Otomatis)` : 'Transaksi Rutin (Otomatis)',
          recurring_id: rt.id,
        });

        // 4. Calculate next date
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
        await this.recurringQueries.updateNextDate(rt.id, nextDate.format('YYYY-MM-DD'));
      }
    }
  }
}

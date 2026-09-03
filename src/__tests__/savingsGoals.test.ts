import dayjs from 'dayjs';
import { SavingsGoalQueries } from '@/lib/queries';

function makeDb(goal: Record<string, any>) {
  const inserted: any[][] = [];
  const goalUpdates: any[][] = [];
  let contributionResult: Record<string, any> | null = null;
  const db: any = {
    getFirstAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      const text = String(sql);
      if (text.includes('FROM savings_goals')) return Promise.resolve(goal);
      if (text.includes('FROM wallets')) return Promise.resolve({ id: params[0] });
      if (text.includes('FROM categories')) return Promise.resolve({ id: params[0] });
      if (text.includes('FROM goal_contributions')) {
        if (text.includes('reversal_of_id')) return Promise.resolve(null);
        return Promise.resolve(contributionResult);
      }
      if (text.includes('source_key')) return Promise.resolve(null);
      return Promise.resolve(null);
    }),
    runAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      const text = String(sql);
      if (text.includes('INSERT INTO transactions')) {
        inserted.push(params);
        return Promise.resolve({ lastInsertRowId: 100 + inserted.length, changes: 1 });
      }
      if (text.includes('INSERT INTO goal_contributions')) {
        const id = params[0] && params.length === 7 ? undefined : 1;
        contributionResult = {
          id: id ?? 1,
          book_id: params[0],
          goal_id: params[1],
          wallet_id: params[2],
          amount: params[3],
          contribution_date: params[4],
          kind: params[5] ?? 'contribution',
          reversal_of_id: null,
          notes: params[6] ?? null,
        };
        return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
      }
      if (text.includes('UPDATE savings_goals')) goalUpdates.push(params);
      return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
  };
  return { db, inserted, goalUpdates };
}

const baseGoal = {
  id: 1, name: 'Laptop', target_amount: 1_000_000, current_amount: 0,
  deadline: '2026-12-31', wallet_id: 2, icon: 'laptop-outline', color: '#6366F1',
  is_completed: 0, book_id: 1,
};

describe('SavingsGoalQueries.contribute', () => {
  it('mencatat transaksi internal, menambah saldo target, dan menurunkan saldo dompet', async () => {
    const { db, inserted, goalUpdates } = makeDb(baseGoal);
    const queries = new SavingsGoalQueries(db, 1);

    const contribution = await queries.contribute(1, 500000, 2, dayjs().format('YYYY-MM-DD'), 'Tabungan Laptop');

    expect(contribution.amount).toBe(500000);
    expect(inserted).toHaveLength(1);
    const tx = inserted[0];
    expect(tx[0]).toBe('expense');
    expect(tx[7]).toBe(1); // book_id
    expect(tx[9]).toBe(1); // is_internal
    expect(tx[10]).toBe(1); // goal_contribution_id
    expect(goalUpdates[0]).toEqual([500000, 0, 1, 1]); // current_amount, is_completed, id, book_id
  });

  it('menandai target selesai saat dana mencapai target', async () => {
    const { db, goalUpdates } = makeDb({ ...baseGoal, current_amount: 800_000 });
    const queries = new SavingsGoalQueries(db, 1);

    await queries.contribute(1, 200000, 2);

    expect(goalUpdates[0]).toEqual([1_000_000, 1, 1, 1]);
  });

  it('menolak kontribusi tanpa dompet sumber', async () => {
    const { db } = makeDb({ ...baseGoal, wallet_id: null });
    const queries = new SavingsGoalQueries(db, 1);

    await expect(queries.contribute(1, 500000, null)).rejects.toThrow('Pilih dompet');
  });
});

describe('SavingsGoalQueries.reverseContribution', () => {
  it('membuat transaksi income internal dan mengembalikan saldo target', async () => {
    const { db, inserted, goalUpdates } = makeDb({ ...baseGoal, current_amount: 500_000 });
    const queries = new SavingsGoalQueries(db, 1);
    // getFirstAsync untuk SELECT kontribusi akan mengembalikan baris kontribusi
    const contributionRow = {
      id: 1, book_id: 1, goal_id: 1, wallet_id: 2, amount: 500000,
      contribution_date: '2026-01-10', kind: 'contribution', reversal_of_id: null, notes: null,
    };
    db.getFirstAsync = jest.fn().mockImplementation((sql: string, params: any[]) => {
      const text = String(sql);
      if (text.includes('reversal_of_id')) return Promise.resolve(null);
      if (text.includes('FROM goal_contributions')) return Promise.resolve(contributionRow);
      if (text.includes('FROM savings_goals')) return Promise.resolve({ ...baseGoal, current_amount: 500_000 });
      if (text.includes('FROM wallets')) return Promise.resolve({ id: params[0] });
      if (text.includes('FROM categories')) return Promise.resolve({ id: params[0] });
      if (text.includes('source_key')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    await queries.reverseContribution(1);

    expect(inserted).toHaveLength(1);
    const tx = inserted[0];
    expect(tx[0]).toBe('income');
    expect(tx[9]).toBe(1); // is_internal
    expect(goalUpdates[0]).toEqual([0, 1, 1]); // current_amount, goal_id, book_id
  });
});

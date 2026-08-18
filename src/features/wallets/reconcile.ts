import { SQLiteDatabase } from 'expo-sqlite';

export async function reconcileWalletBalances(db: SQLiteDatabase): Promise<void> {
  const wallets = await db.getAllAsync<{ id: number; balance: number; initial_balance: number }>(
    'SELECT id, balance, initial_balance FROM wallets'
  );

  for (const w of wallets) {
    const { total } = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as total
       FROM transactions WHERE wallet_id = ?`,
      [w.id]
    ) ?? { total: 0 };

    const expected = Math.round((w.initial_balance + total) * 100) / 100;
    const current = Math.round(w.balance * 100) / 100;

    if (Math.abs(expected - current) > 0.01) {
      await db.runAsync('UPDATE wallets SET balance = ? WHERE id = ?', [expected, w.id]);
    }
  }
}

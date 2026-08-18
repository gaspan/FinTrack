import { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';
import { BudgetQueries } from '@/lib/queries';
import { formatRupiah } from '@/utils/format';
import { scheduleBudgetAlert } from './localNotifications';

export async function checkBudgetAlerts(db: SQLiteDatabase) {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const budgets = await new BudgetQueries(db).getByMonth(month);

    const alerts: string[] = [];

    for (const b of budgets) {
      if (!b.monthly_limit) continue;
      const effectiveLimit = b.monthly_limit + (b.rollover_amount || 0);
      const pct = (b.spent / effectiveLimit) * 100;

      if (pct >= 100) {
        const msg = `⛔ "${b.category_name}" sudah melebihi batas (${formatRupiah(b.spent)} / ${formatRupiah(effectiveLimit)})`;
        alerts.push(msg);
        scheduleBudgetAlert(b.category_name, b.spent, effectiveLimit, pct).catch(() => {});
      } else if (pct >= 90) {
        const msg = `⚠️ "${b.category_name}" hampir habis (${pct.toFixed(0)}% terpakai, sisa ${formatRupiah(effectiveLimit - b.spent)})`;
        alerts.push(msg);
        scheduleBudgetAlert(b.category_name, b.spent, effectiveLimit, pct).catch(() => {});
      }
    }

    if (alerts.length > 0) {
      Alert.alert(
        '⚠️ Peringatan Anggaran',
        alerts.join('\n\n'),
        [{ text: 'Mengerti', style: 'default' }]
      );
    }
  } catch {
  }
}

import { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';
import { BudgetQueries } from '@/lib/queries';
import { formatRupiah } from '@/utils/format';

export async function checkBudgetAlerts(db: SQLiteDatabase) {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const budgets = await new BudgetQueries(db).getByMonth(month);

    const alerts: string[] = [];

    for (const b of budgets) {
      if (!b.monthly_limit) continue;
      const pct = (b.spent / b.monthly_limit) * 100;

      if (pct >= 100) {
        alerts.push(`⛔ "${b.category_name}" sudah melebihi batas (${formatRupiah(b.spent)} / ${formatRupiah(b.monthly_limit)})`);
      } else if (pct >= 90) {
        alerts.push(`⚠️ "${b.category_name}" hampir habis (${pct.toFixed(0)}% terpakai, sisa ${formatRupiah(b.monthly_limit - b.spent)})`);
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

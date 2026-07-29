import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { InsightQueries } from '@/lib/queries';
import { CategoryInsight, SpendingAlert, FinancialHealthScore, FinancialTip } from '@/types';
import { computeFinancialLiteracy } from './financialLiteracy';

export interface InsightData {
  comparisons: CategoryInsight[];
  alerts: SpendingAlert[];
  financialHealth: FinancialHealthScore | null;
  financialTips: FinancialTip[];
}

export async function loadInsights(db: SQLiteDatabase): Promise<InsightData> {
  const queries = new InsightQueries(db);
  const currentMonth = dayjs().format('YYYY-MM');
  const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM');

  const [comparisons, anomalies, deficits, healthData] = await Promise.all([
    queries.getCategoryComparison(currentMonth, prevMonth),
    queries.getAnomalies(currentMonth),
    queries.getDeficitAlerts(),
    queries.getFinancialHealthData(),
  ]);

  const alerts = [
    ...anomalies,
    ...deficits,
  ];

  const { health, tips } = computeFinancialLiteracy(healthData);

  return { comparisons, alerts, financialHealth: health, financialTips: tips };
}

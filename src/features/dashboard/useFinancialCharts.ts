import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useSQLiteContext } from 'expo-sqlite';
import { useBook } from '@/constants/books';
import { TransactionQueries } from '@/lib/queries';
import type { BurnRateDataPoint } from '@/components/charts/BurnRateChart';
import type { CashFlowDataPoint } from '@/components/charts/CashFlowSparklineChart';
import type { BudgetBulletDataPoint } from '@/components/charts/BudgetBulletChart';

/**
 * Hook to calculate cumulative daily spending for burn rate chart
 */
export function useBurnRateData(
  startDate: string,
  endDate: string
): { data: BurnRateDataPoint[]; monthlyBudget: number; currentDay: number; monthDays: number } {
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  return useMemo(() => {
    // This is a placeholder - integrate with your actual data fetching
    // In real implementation, query database for daily transaction sums
    
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const monthDays = end.daysInMonth();
    const currentDay = Math.min(dayjs().date(), monthDays);

    // Generate mock cumulative spending data
    const data: BurnRateDataPoint[] = [];
    let cumulative = 0;
    for (let day = 1; day <= currentDay; day++) {
      const dailyExpense = Math.floor(Math.random() * 500000) + 100000; // Mock data
      cumulative += dailyExpense;
      data.push({
        date: start.date(day).format('YYYY-MM-DD'),
        cumulativeSpending: cumulative,
      });
    }

    // Monthly budget - integrate with your budget system
    const monthlyBudget = 10000000; // Mock: 10M/month

    return {
      data,
      monthlyBudget,
      currentDay,
      monthDays,
    };
  }, [startDate, endDate, db, bookId]);
}

/**
 * Hook to calculate daily running balance for cash flow sparkline
 */
export function useCashFlowSparklineData(
  days: number = 30
): { data: CashFlowDataPoint[]; currentBalance: number; minimumBalance: number } {
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  return useMemo(() => {
    // This is a placeholder - integrate with your actual wallet balance history
    // Query database for daily balance snapshots

    const data: CashFlowDataPoint[] = [];
    let baseBalance = 5000000; // Mock: starting balance

    for (let i = days; i >= 0; i--) {
      const date = dayjs().subtract(i, 'days').format('YYYY-MM-DD');
      const dailyChange = Math.floor(Math.random() * 1000000) - 500000; // Random +/- 500K
      baseBalance = Math.max(0, baseBalance + dailyChange);
      data.push({ date, balance: baseBalance });
    }

    const currentBalance = data[data.length - 1]?.balance ?? 0;
    const minimumBalance = 1000000; // Mock: 1M safety threshold

    return {
      data,
      currentBalance,
      minimumBalance,
    };
  }, [days, db, bookId]);
}

/**
 * Hook to prepare budget data for bullet chart
 */
export function useBudgetBulletData(
  month: string
): BudgetBulletDataPoint[] {
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  return useMemo(() => {
    // This is a placeholder - integrate with your BudgetQueries
    // Query database for category budgets and spending

    const mockData: BudgetBulletDataPoint[] = [
      {
        id: 1,
        categoryName: 'Groceries',
        categoryColor: '#10B981',
        actual: 3500000,
        budget: 5000000,
      },
      {
        id: 2,
        categoryName: 'Transportation',
        categoryColor: '#F59E0B',
        actual: 2800000,
        budget: 3000000,
        rollover: 500000,
      },
      {
        id: 3,
        categoryName: 'Entertainment',
        categoryColor: '#8B5CF6',
        actual: 1200000,
        budget: 1500000,
      },
      {
        id: 4,
        categoryName: 'Utilities',
        categoryColor: '#3B82F6',
        actual: 800000,
        budget: 800000,
      },
      {
        id: 5,
        categoryName: 'Dining',
        categoryColor: '#EC4899',
        actual: 2500000,
        budget: 2000000,
      },
      {
        id: 6,
        categoryName: 'Shopping',
        categoryColor: '#06B6D4',
        actual: 5200000,
        budget: 4000000,
      },
    ];

    return mockData;
  }, [month, db, bookId]);
}

/**
 * Chart Components Export Index
 * 
 * New Essential Financial Charts:
 * 1. BurnRateChart - Cumulative spending vs target pace
 * 2. CashFlowSparklineChart - Daily balance trends
 * 3. BudgetBulletChart - Budget vs actual progress
 * 
 * Refactored Charts:
 * 1. MonthlyTrendComboChart - Enhanced monthly trend with net savings line overlay
 */

export { BurnRateChart } from './BurnRateChart';
export type { BurnRateDataPoint } from './BurnRateChart';

export { CashFlowSparklineChart } from './CashFlowSparklineChart';
export type { CashFlowDataPoint } from './CashFlowSparklineChart';

export { BudgetBulletChart } from './BudgetBulletChart';
export type { BudgetBulletDataPoint } from './BudgetBulletChart';

export { MonthlyTrendComboChart } from './MonthlyTrendComboChart';

// Existing charts (unchanged)
export { OverviewDonutChart } from './OverviewDonutChart';
export { ExpenseDonutChart } from './ExpenseDonutChart';
export { CategoryBarChart } from './CategoryBarChart';
export { MonthlyTrendChart } from './MonthlyTrendChart';
export { MarketAreaChart } from './MarketAreaChart';
export { ChartToggle } from './ChartToggle';
export { DateRangeFilter } from './DateRangeFilter';

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Wallet {
  id: number;
  name: string;
  balance: number;
  icon: string | null;
  color: string | null;
  is_primary?: number;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  wallet_id: number;
  transaction_date: string;
  notes: string | null;
  recurring_id: number | null;
  transfer_id?: number | null;
  created_at: string;
}

export interface TransactionWithDetails extends Transaction {
  category_name: string;
  category_icon: string;
  category_color: string;
  wallet_name: string;
  attachments?: TransactionAttachment[];
  tags?: Tag[];
}

export interface TransactionAttachment {
  id: number;
  transaction_id: number;
  file_path: string;
  file_type: 'image' | 'document';
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  monthly_limit: number;
  month: string;
  rollover_amount: number;
  rollover_enabled: number;
}

export interface RecurringFrequency {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface RecurringTransaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  wallet_id: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  notes: string | null;
  is_active: number;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  wallet_id: number | null;
  icon: string;
  color: string;
  is_completed: number;
  created_at: string;
}

export interface BillReminder {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  frequency: 'one_time' | 'monthly' | 'yearly';
  is_paid: number;
  category_id: number | null;
  wallet_id: number | null;
  notes: string | null;
  created_at: string;
  calendar_event_id?: string | null;
}

export interface AppLock {
  id: number;
  pin_hash: string | null;
  biometric_enabled: number;
}

export interface MonthlyTrendPoint {
  month: string;
  income: number;
  expense: number;
}

export interface ChartDataPoint {
  value: number;
  label: string;
  frontColor?: string;
  color?: string;
  text?: string;
}

export interface CategoryInsight {
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  current_total: number;
  prev_total: number;
  delta: number;
  delta_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SpendingAlert {
  type: 'budget_warning' | 'anomaly' | 'deficit';
  severity: 'low' | 'medium' | 'high';
  message: string;
  category_id?: number;
  category_name?: string;
  amount?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export interface FinancialMetrics {
  savingsRate: number;
  emergencyFundMonths: number;
  expenseRatio: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  overBudgetCount: number;
  hasSavingsGoal: boolean;
  topExpenseCategory: { name: string; total: number } | null;
  monthlyIncome: number;
  monthlyExpense: number;
  totalBalance: number;
  avgMonthlyExpense: number;
}

export interface FinancialHealthScore {
  score: number;
  label: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perhatian';
  color: string;
  metrics: FinancialMetrics;
}

export interface FinancialTip {
  icon: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PayrollSettings {
  enabled: boolean;
  salaryDay: number;
  salaryCategoryId: number | null;
}

export interface Asset {
  id: number;
  name: string;
  type: 'investment' | 'property' | 'other';
  current_value: number;
  initial_value?: number;
  purchase_date?: string;
  notes?: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: number;
  name: string;
  type: 'loan' | 'credit_card' | 'debt' | 'other';
  current_balance: number;
  original_amount?: number;
  interest_rate?: number;
  monthly_payment?: number;
  due_date?: string;
  notes?: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: number;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  created_at: string;
}

export interface Subscription {
  id: number;
  name: string;
  category: 'streaming' | 'software' | 'fitness' | 'news' | 'other';
  amount: number;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  start_date: string;
  next_billing_date: string;
  wallet_id?: number;
  category_id?: number;
  icon: string;
  color: string;
  is_active: number;
  cancelled_date?: string;
  auto_create: number;
  remind: number;
  calendar_event_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SafeToSpendData {
  safeToSpend: number;
  safeToSpendDaily: number;
  totalBalance: number;
  upcomingBills: number;
  savingsTarget: number;
  remainingBalance: number;
  daysRemaining: number;
  color: string;
  status: 'healthy' | 'caution' | 'danger';
}

export interface ForecastPoint {
  date: string;
  projected_balance: number;
  income: number;
  expense: number;
}

export interface CalendarDayData {
  date: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  transactions: TransactionWithDetails[];
}

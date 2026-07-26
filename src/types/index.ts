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
  created_at: string;
}

export interface TransactionWithDetails extends Transaction {
  category_name: string;
  category_icon: string;
  category_color: string;
  wallet_name: string;
}

export interface Budget {
  id: number;
  category_id: number;
  monthly_limit: number;
  month: string;
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

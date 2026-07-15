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
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number;
  wallet_id: number;
  transaction_date: string; // ISO 8601 string (YYYY-MM-DD)
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
  month: string; // YYYY-MM
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
  is_active: number; // 0 or 1
}

export interface ChartDataPoint {
  value: number;
  label: string;
  frontColor?: string;
  color?: string;
  text?: string;
}

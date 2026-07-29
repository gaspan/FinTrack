import { Category } from '@/types';

// Predefined colors for categories matching the dark-mode premium theme
export const CATEGORY_COLORS = {
  INCOME: {
    TEAL: '#00D09C',
    CYAN: '#00B4D8',
    BLUE: '#177AD5',
    INDIGO: '#6366F1',
    PURPLE: '#8B5CF6',
  },
  EXPENSE: {
    RED: '#FF6B6B',
    ORANGE: '#F97316',
    YELLOW: '#EAB308',
    PINK: '#EC4899',
    LIGHT_BLUE: '#38BDF8',
    GRAY: '#9CA3AF',
  }
};

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  // Income Categories
  { name: 'Gaji', type: 'income', icon: 'cash-outline', color: CATEGORY_COLORS.INCOME.TEAL, sort_order: 1 },
  { name: 'Usaha', type: 'income', icon: 'briefcase-outline', color: CATEGORY_COLORS.INCOME.BLUE, sort_order: 2 },
  { name: 'Freelancer', type: 'income', icon: 'laptop-outline', color: CATEGORY_COLORS.INCOME.INDIGO, sort_order: 3 },
  { name: 'Investasi (Profit)', type: 'income', icon: 'trending-up-outline', color: CATEGORY_COLORS.INCOME.CYAN, sort_order: 4 },
  { name: 'Lainnya', type: 'income', icon: 'ellipsis-horizontal-circle-outline', color: CATEGORY_COLORS.INCOME.PURPLE, sort_order: 5 },

  // Expense Categories
  { name: 'Kebutuhan Makan', type: 'expense', icon: 'restaurant-outline', color: CATEGORY_COLORS.EXPENSE.ORANGE, sort_order: 1 },
  { name: 'Transportasi', type: 'expense', icon: 'car-outline', color: CATEGORY_COLORS.EXPENSE.LIGHT_BLUE, sort_order: 2 },
  { name: 'Investasi (Modal Masuk)', type: 'expense', icon: 'wallet-outline', color: CATEGORY_COLORS.EXPENSE.RED, sort_order: 3 },
  { name: 'Jajan/Hiburan', type: 'expense', icon: 'game-controller-outline', color: CATEGORY_COLORS.EXPENSE.PINK, sort_order: 4 },
  { name: 'Parfum & Perawatan', type: 'expense', icon: 'color-wand-outline', color: CATEGORY_COLORS.EXPENSE.YELLOW, sort_order: 5 },
  { name: 'Lainnya', type: 'expense', icon: 'ellipsis-horizontal-circle-outline', color: CATEGORY_COLORS.EXPENSE.GRAY, sort_order: 6 },
];

export const CATEGORY_CLASSIFICATION: Record<string, 'needs' | 'wants' | 'savings'> = {
  'Kebutuhan Makan': 'needs',
  Transportasi: 'needs',
  Gaji: 'savings',
  Usaha: 'savings',
  Freelancer: 'savings',
  'Investasi (Profit)': 'savings',
  'Investasi (Modal Masuk)': 'savings',
  'Jajan/Hiburan': 'wants',
  'Parfum & Perawatan': 'wants',
};

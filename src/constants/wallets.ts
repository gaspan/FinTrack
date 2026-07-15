import { Wallet } from '@/types';

export const DEFAULT_WALLETS: Omit<Wallet, 'id'>[] = [
  { name: 'Cash', balance: 0, icon: 'cash-outline', color: '#10B981' },
  { name: 'Bank Mandiri', balance: 0, icon: 'card-outline', color: '#3B82F6' },
  { name: 'E-Wallet', balance: 0, icon: 'phone-portrait-outline', color: '#8B5CF6' },
];

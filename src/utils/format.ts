import { TransactionWithDetails } from '@/types';

export const calculateTransactionTotals = (transactions: TransactionWithDetails[]) => {
  const result = transactions.reduce(
    (acc, tx) => {
      if (tx.transfer_id) return acc;
      if (tx.type === 'income') {
        acc.totalIncome += tx.amount;
      } else {
        acc.totalExpense += tx.amount;
      }
      acc.transactionCount += 1;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, transactionCount: 0 }
  );
  return { ...result, netTotal: result.totalIncome - result.totalExpense };
};

export const formatRupiah = (val: number) => {
  return `Rp ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

export const formatRupiahNumberOnly = (val: number) => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatRupiahShort = (val: number) => {
  if (Math.abs(val) >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  }
  if (Math.abs(val) >= 1000) {
    return `Rp ${(val / 1000).toFixed(1).replace(/\.0$/, '')}rb`;
  }
  return formatRupiah(val);
};

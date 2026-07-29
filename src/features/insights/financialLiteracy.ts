import { FinancialMetrics, FinancialHealthScore, FinancialTip } from '@/types';
import { formatRupiah } from '@/utils/format';

export function computeFinancialLiteracy(data: {
  monthlyIncome: number;
  monthlyExpense: number;
  totalBalance: number;
  avgMonthlyExpense: number;
  overBudgetCount: number;
  hasSavingsGoal: boolean;
  needsWantsBreakdown: { name: string; total: number; classification: string }[];
  topExpenseCategory: { name: string; total: number } | null;
}): { health: FinancialHealthScore | null; tips: FinancialTip[] } {
  const tips: FinancialTip[] = [];
  const { monthlyIncome, monthlyExpense, totalBalance, avgMonthlyExpense, overBudgetCount, hasSavingsGoal, needsWantsBreakdown, topExpenseCategory } = data;

  if (monthlyIncome === 0 && monthlyExpense === 0 && totalBalance === 0) {
    return { health: null, tips: [] };
  }

  const savingsRate = monthlyIncome > 0
    ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
    : 0;

  const expenseRatio = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0;

  const emergencyFundMonths = avgMonthlyExpense > 0 ? totalBalance / avgMonthlyExpense : 0;

  const needsTotal = needsWantsBreakdown.filter(c => c.classification === 'needs').reduce((s, c) => s + c.total, 0);
  const wantsTotal = needsWantsBreakdown.filter(c => c.classification === 'wants').reduce((s, c) => s + c.total, 0);
  const savingsDiscretionary = monthlyIncome - monthlyExpense;
  const spendBase = monthlyIncome > needsTotal ? monthlyIncome : needsTotal + wantsTotal;

  const needsPct = monthlyIncome > 0 ? (needsTotal / monthlyIncome) * 100 : 0;
  const wantsPct = monthlyIncome > 0 ? (wantsTotal / monthlyIncome) * 100 : 0;
  const savingsPct = monthlyIncome > 0 ? (savingsDiscretionary / monthlyIncome) * 100 : 0;

  let score = 0;
  let validMetrics = 0;

  if (monthlyIncome > 0) {
    validMetrics++;
    score += Math.min(savingsRate / 20 * 25, 25);
  }

  if (avgMonthlyExpense > 0 && totalBalance > 0) {
    validMetrics++;
    score += Math.min(emergencyFundMonths / 6 * 25, 25);
  }

  if (monthlyIncome > 0) {
    validMetrics++;
    score += Math.min((100 - Math.abs(50 - needsPct)) / 50 * 15, 15);
    validMetrics++;
    score += Math.max(0, (30 - wantsPct) / 30 * 15);
  }

  if (monthlyIncome > 0 && overBudgetCount === 0) {
    validMetrics++;
    score += 10;
  }

  if (hasSavingsGoal) {
    validMetrics++;
    score += 10;
  }

  score = validMetrics > 0 ? Math.round(score) : 0;
  score = Math.min(100, score);

  const label: FinancialHealthScore['label'] =
    score >= 80 ? 'Sangat Baik' : score >= 60 ? 'Baik' : score >= 35 ? 'Cukup' : 'Perlu Perhatian';
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#6366F1' : score >= 35 ? '#F59E0B' : '#EF4444';

  const srText = savingsRate.toFixed(0);
  const emText = emergencyFundMonths.toFixed(1);

  if (savingsRate < 20 && monthlyIncome > 0) {
    const catTip = topExpenseCategory ? ` — coba pangkas ${topExpenseCategory.name}` : '';
    tips.push({ icon: 'wallet-outline', message: `Tabunganmu ${srText}% dari pemasukan. Target ideal 20%${catTip}.`, priority: 'high' });
  }

  if (emergencyFundMonths < 3 && avgMonthlyExpense > 0) {
    tips.push({ icon: 'shield-checkmark-outline', message: `Dana daruratmu cukup ${emText} bulan (ideal ≥3). Alokasikan Rp ${formatRupiah(Math.round(avgMonthlyExpense * (6 - emergencyFundMonths)))} lagi.`, priority: 'high' });
  }

  if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
    tips.push({ icon: 'alert-circle-outline', message: `Bulan ini defisit Rp ${formatRupiah(monthlyExpense - monthlyIncome)}. Tinjau kembali pengeluaranmu.`, priority: 'high' });
  }

  if (wantsPct > 30 && monthlyIncome > 0) {
    tips.push({ icon: 'cart-outline', message: `Pengeluaran keinginan ${wantsPct.toFixed(0)}% (ideal ≤30%). Pertimbangkan realokasi ke tabungan.`, priority: 'medium' });
  }

  if (overBudgetCount > 0) {
    tips.push({ icon: 'trending-up-outline', message: `${overBudgetCount} kategori melebihi anggaran bulan ini. Sesuaikan anggaran atau kurangi pengeluaran.`, priority: 'medium' });
  }

  if (!hasSavingsGoal) {
    tips.push({ icon: 'flag-outline', message: 'Kamu belum punya target menabung. Mulai dengan tujuan kecil untuk bangun kebiasaan.', priority: 'low' });
  }

  if (tips.length === 0) {
    tips.push({ icon: 'thumbs-up-outline', message: 'Keuanganmu sehat! Pertimbangkan mulai berinvestasi dan diversifikasi aset.', priority: 'low' });
  }

  const metrics: FinancialMetrics = {
    savingsRate, emergencyFundMonths, expenseRatio, needsPct, wantsPct, savingsPct,
    overBudgetCount, hasSavingsGoal, topExpenseCategory, monthlyIncome, monthlyExpense, totalBalance, avgMonthlyExpense,
  };

  return { health: { score, label, color, metrics }, tips: tips.slice(0, 4) };
}

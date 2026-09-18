import { shuffle } from './data';

export interface BudgetProfile {
  id: string;
  name: string;
  income: number;
  description: string;
  minAllocations: {
    necessities: number;
    wants: number;
    savings: number;
  };
}

// Represent allocations as percentages (0-100)
export interface BudgetAllocation {
  necessities: number;
  wants: number;
  savings: number;
}

export const BUDGET_PROFILES: BudgetProfile[] = [
  {
    id: 'single_jakarta',
    name: 'Karyawan Single Jakarta',
    income: 8000000,
    description: 'Tinggal ngekos di Jakarta, transportasi KRL. Butuh dana darurat kuat.',
    minAllocations: { necessities: 50, wants: 30, savings: 20 },
  },
  {
    id: 'family_1_child',
    name: 'Keluarga 1 Anak',
    income: 12000000,
    description: 'Punya 1 anak balita, cicilan KPR, dan mobil LCGC.',
    minAllocations: { necessities: 60, wants: 20, savings: 20 },
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    income: 6000000,
    description: 'Pemasukan tidak tetap tiap bulan. Butuh keamanan ekstra.',
    minAllocations: { necessities: 40, wants: 20, savings: 40 },
  },
  {
    id: 'student_scholarship',
    name: 'Mahasiswa Beasiswa',
    income: 2500000,
    description: 'Uang saku bulanan dari beasiswa. Hidup super hemat.',
    minAllocations: { necessities: 70, wants: 10, savings: 20 },
  },
  {
    id: 'manager',
    name: 'Manajer Perusahaan',
    income: 25000000,
    description: 'Gaji besar, tapi banyak tuntutan sosial (lifestyle).',
    minAllocations: { necessities: 40, wants: 30, savings: 30 },
  }
];

export function getRandomBudgetProfile(): BudgetProfile {
  return shuffle(BUDGET_PROFILES)[0];
}

/**
 * Skor maksimum = 100
 * Tiap selisih persen dari target akan mengurangi skor.
 */
export function calculateBudgetScore(profile: BudgetProfile, allocation: BudgetAllocation): number {
  const target = profile.minAllocations;
  
  const diffNecessities = Math.abs(target.necessities - allocation.necessities);
  const diffWants = Math.abs(target.wants - allocation.wants);
  const diffSavings = Math.abs(target.savings - allocation.savings);
  
  const totalDiff = diffNecessities + diffWants + diffSavings;
  
  // Max diff is roughly 100-200. Let's make it so 0 diff = 100 score. 
  // Each 1% diff = -1 score.
  const score = Math.max(0, 100 - totalDiff);
  return score;
}

export function getBudgetFeedback(score: number): string {
  if (score >= 95) return 'Sempurna! Alokasi kamu sangat sehat dan tepat sasaran.';
  if (score >= 80) return 'Bagus! Hampir ideal, tinggal sedikit penyesuaian.';
  if (score >= 60) return 'Cukup. Masih ada ruang untuk perbaikan, terutama di porsi tabungan.';
  return 'Kurang sehat. Periksa lagi prioritas keuanganmu agar tidak boncos di akhir bulan.';
}

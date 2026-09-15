import { SQLiteDatabase } from 'expo-sqlite';
import dayjs from 'dayjs';
import { formatRupiah } from '@/utils/format';
import { EXCLUDE_TRANSFER_CATEGORY_SQL } from '@/lib/queries';
import { shuffle } from './data';

export interface DataQuestion {
  q: string;
  options: [string, string, string, string];
  answer: number;
  tip: string;
  source: string;
}

// Helper to generate wrong options by varying the correct amount
function generateAmountOptions(correctAmount: number): [number, number, number, number] {
  if (correctAmount === 0) {
    return [0, 50000, 100000, 150000];
  }
  
  const options = new Set<number>();
  options.add(correctAmount);
  
  // Try to generate realistic looking wrong answers
  const multipliers = [0.7, 0.85, 1.15, 1.3, 1.5, 0.5];
  const shuffledMultipliers = shuffle(multipliers);
  
  // Round to nearest 1000 to look like real numbers
  let i = 0;
  while (options.size < 4 && i < shuffledMultipliers.length) {
    const wrong = Math.round((correctAmount * shuffledMultipliers[i]) / 1000) * 1000;
    if (wrong !== correctAmount) {
      options.add(wrong);
    }
    i++;
  }
  
  // Fallback if we still don't have 4 (rare)
  while (options.size < 4) {
    options.add(correctAmount + (options.size * 10000));
  }
  
  return Array.from(options) as [number, number, number, number];
}

function generatePercentageOptions(correctPct: number): [number, number, number, number] {
  const options = new Set<number>();
  options.add(correctPct);
  
  const variations = [-15, -10, -5, 5, 10, 15, 20, 25];
  const shuffled = shuffle(variations);
  
  let i = 0;
  while (options.size < 4 && i < shuffled.length) {
    const wrong = Math.max(1, Math.min(100, correctPct + shuffled[i]));
    if (wrong !== correctPct) options.add(wrong);
    i++;
  }
  
  return Array.from(options) as [number, number, number, number];
}

export async function generateDataQuestions(db: SQLiteDatabase, bookId: number): Promise<DataQuestion[]> {
  const questions: DataQuestion[] = [];
  const currentMonth = dayjs().format('YYYY-MM');
  const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  
  // 1. Total Expense Current Month
  const summary = await db.getFirstAsync<{ income: number, expense: number }>(`
    SELECT 
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
    WHERE t.book_id = ? AND strftime('%Y-%m', t.transaction_date) = ?
      AND t.transfer_id IS NULL AND t.is_internal = 0
      AND ${EXCLUDE_TRANSFER_CATEGORY_SQL}
  `, [bookId, currentMonth]);
  
  if (summary && summary.expense > 0) {
    const opts = generateAmountOptions(summary.expense);
    const shuffledOpts = shuffle(opts);
    const answerIdx = shuffledOpts.indexOf(summary.expense);
    questions.push({
      q: `Berapa total pengeluaranmu bulan ini sejauh ini?`,
      options: [formatRupiah(shuffledOpts[0]), formatRupiah(shuffledOpts[1]), formatRupiah(shuffledOpts[2]), formatRupiah(shuffledOpts[3])],
      answer: answerIdx,
      tip: `Catat setiap pengeluaran sekecil apapun agar akurat! Total aslimu: ${formatRupiah(summary.expense)}`,
      source: 'summary'
    });
    
    // 2. Savings Rate (if income > 0)
    if (summary.income > 0) {
      const savingsRate = Math.round(((summary.income - summary.expense) / summary.income) * 100);
      // Only ask if it makes sense (0 to 100%)
      if (savingsRate >= 0 && savingsRate <= 100) {
        const opts = generatePercentageOptions(savingsRate);
        const shuffledOpts = shuffle(opts);
        const answerIdx = shuffledOpts.indexOf(savingsRate);
        questions.push({
          q: `Berapa persen dari pemasukan yang berhasil kamu simpan bulan ini?`,
          options: [`${shuffledOpts[0]}%`, `${shuffledOpts[1]}%`, `${shuffledOpts[2]}%`, `${shuffledOpts[3]}%`],
          answer: answerIdx,
          tip: savingsRate >= 20 ? 'Hebat! Kamu berhasil menyisihkan minimal 20% sesuai aturan finansial.' : 'Coba tekan pengeluaran terselubung (latte factor) agar tabungan naik.',
          source: 'savings_rate'
        });
      }
    }
  }

  // 3. Top Expense Category Current Month
  const topCategories = await db.getAllAsync<{ name: string, total: number }>(`
    SELECT c.name, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
    WHERE t.book_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
      AND t.transfer_id IS NULL AND t.is_internal = 0
      AND ${EXCLUDE_TRANSFER_CATEGORY_SQL}
    GROUP BY c.id
    ORDER BY total DESC
    LIMIT 4
  `, [bookId, currentMonth]);

  if (topCategories.length >= 3) {
    const topCat = topCategories[0];
    
    // Ask amount of top category
    const opts = generateAmountOptions(topCat.total);
    const shuffledOpts = shuffle(opts);
    const answerIdx = shuffledOpts.indexOf(topCat.total);
    questions.push({
      q: `Berapa pengeluaranmu untuk kategori ${topCat.name} bulan ini?`,
      options: [formatRupiah(shuffledOpts[0]), formatRupiah(shuffledOpts[1]), formatRupiah(shuffledOpts[2]), formatRupiah(shuffledOpts[3])],
      answer: answerIdx,
      tip: `${topCat.name} adalah penyedot dana terbesarmu saat ini.`,
      source: 'top_cat_amount'
    });
    
    // Ask which category is biggest
    const catNames = [topCategories[0].name, topCategories[1].name, topCategories[2].name, 'Lainnya'];
    const shuffledCatNames = shuffle(catNames);
    const answerNameIdx = shuffledCatNames.indexOf(topCat.name);
    questions.push({
      q: `Kategori apa yang paling banyak menguras dompetmu bulan ini?`,
      options: [shuffledCatNames[0], shuffledCatNames[1], shuffledCatNames[2], shuffledCatNames[3]],
      answer: answerNameIdx,
      tip: `Kategori ${topCat.name} memakan biaya ${formatRupiah(topCat.total)}.`,
      source: 'top_cat_name'
    });
  }

  // 4. Biggest single transaction
  const biggestTx = await db.getFirstAsync<{ amount: number, notes: string, category_name: string }>(`
    SELECT t.amount, t.notes, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
    WHERE t.book_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
      AND t.transfer_id IS NULL AND t.is_internal = 0
      AND ${EXCLUDE_TRANSFER_CATEGORY_SQL}
    ORDER BY t.amount DESC
    LIMIT 1
  `, [bookId, currentMonth]);

  if (biggestTx && biggestTx.amount > 0) {
    const opts = generateAmountOptions(biggestTx.amount);
    const shuffledOpts = shuffle(opts);
    const answerIdx = shuffledOpts.indexOf(biggestTx.amount);
    const txName = biggestTx.notes ? biggestTx.notes.substring(0, 20) : biggestTx.category_name;
    questions.push({
      q: `Berapa nilai transaksi pengeluaran terbesarmu bulan ini? (${txName})`,
      options: [formatRupiah(shuffledOpts[0]), formatRupiah(shuffledOpts[1]), formatRupiah(shuffledOpts[2]), formatRupiah(shuffledOpts[3])],
      answer: answerIdx,
      tip: `Transaksi tunggal terbesar sangat berdampak pada arus kas bulanan.`,
      source: 'biggest_tx'
    });
  }

  // 5. Month over Month comparison
  const prevSummary = await db.getFirstAsync<{ expense: number }>(`
    SELECT COALESCE(SUM(t.amount), 0) as expense
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id AND c.book_id = t.book_id
    WHERE t.book_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
      AND t.transfer_id IS NULL AND t.is_internal = 0
      AND ${EXCLUDE_TRANSFER_CATEGORY_SQL}
  `, [bookId, prevMonth]);

  if (summary && summary.expense > 0 && prevSummary && prevSummary.expense > 0) {
    const diff = summary.expense - prevSummary.expense;
    const isUp = diff > 0;
    const absDiff = Math.abs(diff);
    
    // Only ask if there is a significant difference (> 50k)
    if (absDiff > 50000) {
      const opts = generateAmountOptions(absDiff);
      const shuffledOpts = shuffle(opts);
      const answerIdx = shuffledOpts.indexOf(absDiff);
      questions.push({
        q: `Pengeluaran bulan ini ${isUp ? 'NAIK' : 'TURUN'} berapa rupiah dibanding bulan lalu?`,
        options: [formatRupiah(shuffledOpts[0]), formatRupiah(shuffledOpts[1]), formatRupiah(shuffledOpts[2]), formatRupiah(shuffledOpts[3])],
        answer: answerIdx,
        tip: isUp ? 'Hati-hati gaya hidup merangkak naik (lifestyle inflation).' : 'Pertahankan kebiasaan hemat ini!',
        source: 'mom_diff'
      });
    }
  }

  // 6. Wallets Distribution
  const wallets = await db.getAllAsync<{ name: string, balance: number }>(`
    SELECT name, balance FROM wallets WHERE book_id = ? AND balance > 0 ORDER BY balance DESC
  `, [bookId]);
  
  if (wallets.length >= 2) {
    const topWallet = wallets[0];
    const opts = generateAmountOptions(topWallet.balance);
    const shuffledOpts = shuffle(opts);
    const answerIdx = shuffledOpts.indexOf(topWallet.balance);
    questions.push({
      q: `Berapa saldo di dompet terbesarmu saat ini (${topWallet.name})?`,
      options: [formatRupiah(shuffledOpts[0]), formatRupiah(shuffledOpts[1]), formatRupiah(shuffledOpts[2]), formatRupiah(shuffledOpts[3])],
      answer: answerIdx,
      tip: 'Selalu sisakan batas aman di rekening utama untuk kondisi darurat harian.',
      source: 'wallet_balance'
    });
  }

  return questions;
}

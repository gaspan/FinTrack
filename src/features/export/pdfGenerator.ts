import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';
import { TransactionWithDetails } from '@/types';
import { formatRupiah } from '@/utils/format';

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  categoryBreakdown: { category_name: string; total: number; color: string }[];
}

const formatRp = formatRupiah;

const buildHTML = (
  transactions: TransactionWithDetails[],
  summary: SummaryData,
  reportPeriod: string,
  generatedDate: string,
) => {
  const netBalance = summary.totalIncome - summary.totalExpense;
  const totalTransactionValue = summary.totalIncome + summary.totalExpense;

  const incomePctNum = totalTransactionValue > 0
    ? ((summary.totalIncome / totalTransactionValue) * 100)
    : 0;
  const expensePctNum = totalTransactionValue > 0
    ? ((summary.totalExpense / totalTransactionValue) * 100)
    : 0;

  const sortedCategories = [...summary.categoryBreakdown].sort(
    (a, b) => b.total - a.total,
  );
  const maxCategoryTotal = sortedCategories.length > 0
    ? Math.max(...sortedCategories.map(c => c.total))
    : 1;

  const transactionRows = transactions
    .map(t => `
      <tr>
        <td>${dayjs(t.transaction_date).format('DD MMM YYYY')}</td>
        <td><span class="badge ${t.type}">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
        <td>${t.category_name}</td>
        <td class="num">${formatRp(t.amount)}</td>
      </tr>
    `).join('');

  const categoryRows = sortedCategories.map(cat => {
    const pct = totalTransactionValue > 0
      ? ((cat.total / totalTransactionValue) * 100).toFixed(1)
      : '0.0';
    const barWidth = Math.max((cat.total / maxCategoryTotal) * 100, 5);
    return `
      <tr>
        <td>
          <span class="cat-dot" style="background-color: ${cat.color}"></span>
          ${cat.category_name}
        </td>
        <td class="num">${formatRp(cat.total)}</td>
        <td class="num">${pct}%</td>
        <td class="bar-cell">
          <div class="bar" style="width: ${barWidth}%; background-color: ${cat.color}"></div>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 20mm 16mm 25mm 16mm;
    @bottom-center {
      content: "Halaman " counter(page) " dari " counter(pages);
      font-size: 9px;
      color: #9E9E9E;
      font-family: sans-serif;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #1A1A2E;
    background: #FAFBFC;
    font-size: 11px;
    line-height: 1.5;
  }
  .page { padding: 0; }
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    padding: 20px 24px;
    border-radius: 12px;
    margin-bottom: 16px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .app-name {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .app-name span { color: #4A9EFF; }
  .report-title {
    font-size: 16px;
    font-weight: 600;
    opacity: 0.95;
  }
  .report-subtitle {
    font-size: 10px;
    opacity: 0.7;
    margin-top: 2px;
  }
  .summary-grid {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  .summary-card {
    flex: 1;
    background: white;
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    border-left: 4px solid;
  }
  .summary-card.balance { border-color: #4A9EFF; }
  .summary-card.income { border-color: #22C55E; }
  .summary-card.expense { border-color: #EF4444; }
  .card-label {
    font-size: 9px;
    color: #8E8E93;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .card-value {
    font-size: 18px;
    font-weight: 700;
  }
  .card-value.income-color { color: #22C55E; }
  .card-value.expense-color { color: #EF4444; }
  .comparison-section {
    background: white;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 12px;
    color: #1A1A2E;
  }
  .chart-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .chart-label {
    width: 80px;
    font-size: 11px;
    font-weight: 600;
  }
  .chart-label.income-text { color: #22C55E; }
  .chart-label.expense-text { color: #EF4444; }
  .chart-bar-track {
    flex: 1;
    height: 28px;
    background: #F0F0F0;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }
  .chart-bar-fill {
    height: 100%;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    min-width: 30px;
  }
  .chart-bar-fill.income-fill { background: linear-gradient(90deg, #22C55E, #16A34A); }
  .chart-bar-fill.expense-fill { background: linear-gradient(90deg, #EF4444, #DC2626); }
  .chart-value {
    width: 60px;
    text-align: right;
    font-size: 11px;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    margin-bottom: 16px;
  }
  th {
    background: #1A1A2E;
    color: white;
    padding: 10px 12px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    font-weight: 600;
  }
  th.num { text-align: right; }
  th.bar-col { text-align: center; width: 80px; }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #F0F0F0;
    font-size: 10px;
  }
  td.num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  td:last-child, th:last-child { border-right: none; }
  tr:last-child td { border-bottom: none; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge.income { background: #F0FDF4; color: #16A34A; }
  .badge.expense { background: #FEF2F2; color: #DC2626; }
  .cat-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .bar-cell { width: 80px; }
  .bar {
    height: 8px;
    border-radius: 4px;
    min-width: 4px;
  }
  .footer {
    text-align: center;
    padding: 12px;
    font-size: 9px;
    color: #8E8E93;
  }
  .footer-row {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #8E8E93;
    margin-top: 8px;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div class="app-name"><span>Fin</span>Track</div>
        <div style="text-align:right">
          <div class="report-title">Laporan Keuangan</div>
          <div class="report-subtitle">${reportPeriod}</div>
        </div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card balance">
        <div class="card-label">Saldo Bersih</div>
        <div class="card-value" style="color: ${netBalance >= 0 ? '#22C55E' : '#EF4444'}">${formatRp(netBalance)}</div>
      </div>
      <div class="summary-card income">
        <div class="card-label">Total Pemasukan</div>
        <div class="card-value income-color">${formatRp(summary.totalIncome)}</div>
      </div>
      <div class="summary-card expense">
        <div class="card-label">Total Pengeluaran</div>
        <div class="card-value expense-color">${formatRp(summary.totalExpense)}</div>
      </div>
    </div>

    <div class="comparison-section">
      <div class="section-title">Perbandingan Pemasukan vs Pengeluaran</div>
      <div class="chart-row">
        <div class="chart-label income-text">Pemasukan</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill income-fill" style="width: ${Math.max(incomePctNum, 5)}%">${incomePctNum.toFixed(0)}%</div>
        </div>
        <div class="chart-value" style="color:#22C55E">${formatRp(summary.totalIncome)}</div>
      </div>
      <div class="chart-row">
        <div class="chart-label expense-text">Pengeluaran</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill expense-fill" style="width: ${Math.max(expensePctNum, 5)}%">${expensePctNum.toFixed(0)}%</div>
        </div>
        <div class="chart-value" style="color:#EF4444">${formatRp(summary.totalExpense)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Kategori</th>
          <th class="num">Total</th>
          <th class="num">Persentase</th>
          <th class="bar-col">Distribusi</th>
        </tr>
      </thead>
      <tbody>${categoryRows}</tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Tipe</th>
          <th>Kategori</th>
          <th class="num">Nominal</th>
        </tr>
      </thead>
      <tbody>${transactionRows || '<tr><td colspan="4" style="text-align:center;color:#8E8E93;padding:20px">Tidak ada transaksi</td></tr>'}</tbody>
    </table>

    <div class="footer-row">
      <span>Dicetak pada ${generatedDate}</span>
      <span>FinTrack</span>
    </div>
  </div>
</body>
</html>`;
};

export const generateAndSharePDF = async (
  transactions: TransactionWithDetails[],
  summary: SummaryData,
  reportPeriod: string,
) => {
  try {
    const generatedDate = dayjs().format('DD MMMM YYYY, HH:mm');
    const html = buildHTML(transactions, summary, reportPeriod, generatedDate);

    // Request base64 from printToFileAsync to avoid temp URI permission issues
    const { base64 } = await Print.printToFileAsync({ html, base64: true });

    if (!base64) {
      throw new Error('Gagal menghasilkan base64 PDF');
    }

    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const fileName = `FinTrack_Laporan_${timestamp}.pdf`;
    const destUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(destUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(destUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Bagikan Laporan FinTrack',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.warn('Fitur berbagi tidak tersedia di perangkat ini');
    }
  } catch (error) {
    console.error('Gagal membuat atau membagikan PDF:', error);
    throw error;
  }
};
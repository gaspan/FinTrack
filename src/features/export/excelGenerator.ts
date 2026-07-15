import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { TransactionWithDetails } from '@/types';
import dayjs from 'dayjs';

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  categoryBreakdown: { category_name: string; total: number; color: string }[];
}

export const generateAndShareExcel = async (
  transactions: TransactionWithDetails[],
  summary: SummaryData,
  reportPeriod: string
) => {
  try {
    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();

    // 2. Prepare Summary Sheet Data
    const netBalance = summary.totalIncome - summary.totalExpense;

    const summarySheetData: any[] = [
      ['FinTrack - Laporan Keuangan'],
      [],
      ['Periode Laporan', reportPeriod],
      ['Total Pemasukan', summary.totalIncome], // Numbers are better left raw for Excel formulas, or we can format them. Let's keep them raw.
      ['Total Pengeluaran', summary.totalExpense],
      ['Saldo Bersih', netBalance],
      [],
      ['Breakdown per Kategori'],
      ['Kategori', 'Total (Rp)', 'Persentase']
    ];

    const totalTransactionValue = summary.totalIncome + summary.totalExpense;

    summary.categoryBreakdown.forEach(cat => {
      const percentage = totalTransactionValue > 0 
        ? ((cat.total / totalTransactionValue) * 100).toFixed(1) + '%' 
        : '0%';
      summarySheetData.push([cat.category_name, cat.total, percentage]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
    
    // Set column widths for Summary
    summarySheet['!cols'] = [
      { wch: 25 }, // Col A
      { wch: 20 }, // Col B
      { wch: 15 }, // Col C
    ];

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');

    // 3. Prepare Transaction Data Sheet
    const transactionSheetData = transactions.map(t => ({
      'Tanggal': dayjs(t.transaction_date).format('DD MMM YYYY'),
      'Tipe': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      'Kategori': t.category_name,
      'Dompet': t.wallet_name,
      'Nominal': t.amount,
      'Catatan': t.notes || '-'
    }));

    const dataSheet = XLSX.utils.json_to_sheet(transactionSheetData);

    // Set column widths for Data
    dataSheet['!cols'] = [
      { wch: 15 }, // Tanggal
      { wch: 12 }, // Tipe
      { wch: 20 }, // Kategori
      { wch: 15 }, // Dompet
      { wch: 15 }, // Nominal
      { wch: 30 }, // Catatan
    ];

    XLSX.utils.book_append_sheet(wb, dataSheet, 'Data Transaksi');

    // 4. Generate base64
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // 5. Write to FileSystem
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const fileName = `FinTrack_Laporan_${timestamp}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 6. Share via native share dialog
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Bagikan Laporan FinTrack',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      console.warn('Fitur berbagi tidak tersedia di perangkat ini');
    }
  } catch (error) {
    console.error('Gagal membuat atau membagikan file Excel:', error);
    throw error;
  }
};

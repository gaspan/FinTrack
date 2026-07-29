import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { useTheme, type Theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { formatRupiah } from '@/utils/format';

export default function ImportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  };

  const detectBankColumns = (headers: string[]): {
    date: number; desc: number; amount: number; type: number;
  } | null => {
    const h = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    const date = h.findIndex(x => x.includes('tanggal') || x.includes('date') || x.includes('tgl'));
    const desc = h.findIndex(x => x.includes('keterangan') || x.includes('desc') || x.includes('uraian') || x.includes('description'));
    const amount = h.findIndex(x => x.includes('jumlah') || x.includes('amount') || x.includes('nominal') || x.includes('nilai'));
    const type = h.findIndex(x => x.includes('tipe') || x.includes('type') || x.includes('jenis') || x.includes('posisi'));
    if (date === -1 || desc === -1 || amount === -1) return null;
    return { date, desc, amount, type };
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setResult(null);

      const pickResult = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (pickResult.canceled) return;

      const file = pickResult.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });

      const lines = content.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) { Alert.alert('Error', 'File CSV kosong atau tidak valid'); return; }

      const headers = parseCSVLine(lines[0]);
      const columns = detectBankColumns(headers);

      if (!columns) {
        Alert.alert('Format Tidak Didukung', 'Pastikan CSV memiliki kolom: Tanggal, Keterangan, dan Jumlah.');
        return;
      }

      const expenseCat = await db.getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE type='expense' AND name='Lainnya' LIMIT 1");
      const incomeCat = await db.getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE type='income' AND name='Lainnya' LIMIT 1");
      const defaultWallet = await db.getFirstAsync<{ id: number }>('SELECT id FROM wallets ORDER BY id ASC LIMIT 1');

      if (!expenseCat || !incomeCat || !defaultWallet) {
        Alert.alert('Error', 'Data kategori atau dompet tidak ditemukan');
        return;
      }

      let imported = 0;
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = parseCSVLine(lines[i]);
          if (cols.length <= Math.max(columns.date, columns.desc, columns.amount)) { skipped++; continue; }

          const rawDate = cols[columns.date].replace(/"/g, '').trim();
          let dateStr: string | null = null;
          const formats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD'];
          for (const fmt of formats) {
            const d = dayjs(rawDate, fmt);
            if (d.isValid()) { dateStr = d.format('YYYY-MM-DD'); break; }
          }
          if (!dateStr) { skipped++; continue; }

          const desc = cols[columns.desc].replace(/"/g, '').trim();
          const rawAmount = cols[columns.amount].replace(/[^0-9.,\-]/g, '').replace(/\./g, '').replace(',', '.');
          const amount = parseFloat(rawAmount);
          if (isNaN(amount) || amount <= 0) { skipped++; continue; }

          const isExpense = columns.type >= 0
            ? cols[columns.type].toLowerCase().includes('debit') || cols[columns.type].toLowerCase().includes('keluar') || cols[columns.type].toLowerCase().includes('db')
            : rawAmount.startsWith('-');

          const txType = isExpense ? 'expense' : 'income';
          const catId = isExpense ? expenseCat.id : incomeCat.id;

          const exists = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM transactions WHERE amount = ? AND category_id = ? AND transaction_date = ? AND notes = ? LIMIT 1',
            [amount, catId, dateStr, desc]
          );
          if (exists) { skipped++; continue; }

          await db.runAsync(
            'INSERT INTO transactions (type, amount, category_id, wallet_id, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [txType, Math.abs(amount), catId, defaultWallet.id, dateStr, desc]
          );

          const op = txType === 'income' ? '+' : '-';
          await db.runAsync(`UPDATE wallets SET balance = balance ${op} ? WHERE id = ?`, [Math.abs(amount), defaultWallet.id]);

          imported++;
        } catch { skipped++; }
      }

      setResult({ imported, skipped });
      Alert.alert('Impor Selesai', `${imported} transaksi berhasil diimpor.\n${skipped} dilewati.`);
    } catch (e: any) {
      if (e?.message !== 'Pembatalan') Alert.alert('Error', e?.message || 'Gagal mengimpor');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="cloud-upload-outline" size={64} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>Impor CSV Rekening Koran</Text>
      <Text style={styles.subtitle}>
        Impor transaksi dari file CSV bank Indonesia (BCA, Mandiri, BRI, dll).{'\n'}
        Pastikan CSV memiliki kolom: Tanggal, Keterangan, Jumlah.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Format yang Didukung:</Text>
        <Text style={styles.infoText}>• Kolom: Tanggal, Keterangan, Jumlah (dan Type opsional)</Text>
        <Text style={styles.infoText}>• Format tanggal: YYYY-MM-DD, DD/MM/YYYY, atau DD-MM-YYYY</Text>
        <Text style={styles.infoText}>• Transaksi baru akan ditambahkan (cek duplikat otomatis)</Text>
        <Text style={styles.infoText}>• Dompet default: dompet pertama Anda</Text>
      </View>

      <Button
        title="Pilih File CSV"
        onPress={handleImport}
        loading={importing}
        fullWidth
      />

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Hasil Impor</Text>
          <Text style={styles.resultText}>Berhasil: {result.imported} transaksi</Text>
          <Text style={styles.resultText}>Dilewati: {result.skipped} transaksi</Text>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, alignItems: 'center' },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg },
  title: { ...theme.typography.h2, textAlign: 'center', marginBottom: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xl, lineHeight: 20 },
  infoCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, width: '100%', marginBottom: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border },
  infoTitle: { ...theme.typography.body, fontWeight: '600', marginBottom: theme.spacing.sm },
  infoText: { ...theme.typography.bodySmall, marginBottom: 4 },
  resultCard: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md, padding: theme.spacing.md, width: '100%', marginTop: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  resultTitle: { ...theme.typography.body, fontWeight: '600', marginBottom: theme.spacing.sm },
  resultText: { ...theme.typography.bodySmall, marginBottom: 2 },
});

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { CategoryQueries, WalletQueries } from '@/lib/queries';
import { Category, Wallet } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/utils/format';
import {
  columnLabel,
  CsvColumnMapping,
  detectColumnMapping,
  parseCsv,
  ParsedCsv,
} from '@/features/import/csvParser';
import {
  annotateCsvDuplicates,
  createCsvPreview,
  CsvImportMapping,
  CsvImportResult,
  CsvPreview,
  commitCsvImport,
  ImportDateOrder,
} from '@/features/import/csvImportService';

type MappingField = keyof CsvColumnMapping;

const MAPPING_FIELDS: { key: MappingField; label: string }[] = [
  { key: 'date', label: 'Tanggal' },
  { key: 'description', label: 'Keterangan' },
  { key: 'amount', label: 'Nominal' },
  { key: 'direction', label: 'Arah / Tipe' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Kredit' },
  { key: 'category', label: 'Kategori sumber' },
  { key: 'wallet', label: 'Rekening sumber' },
];

const EMPTY_MAPPING: CsvImportMapping = {
  date: null,
  description: null,
  amount: null,
  direction: null,
  debit: null,
  credit: null,
  category: null,
  wallet: null,
  defaultWalletId: null,
  defaultIncomeCategoryId: null,
  defaultExpenseCategoryId: null,
  positiveAmountType: null,
};

function mappingIsReady(mapping: CsvImportMapping) {
  return mapping.date !== null
    && mapping.description !== null
    && (mapping.amount !== null || mapping.debit !== null || mapping.credit !== null)
    && mapping.defaultWalletId !== null
    && mapping.defaultIncomeCategoryId !== null
    && mapping.defaultExpenseCategoryId !== null;
}

export default function ImportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvImportMapping>(EMPTY_MAPPING);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mappingField, setMappingField] = useState<MappingField | null>(null);
  const [dateOrder, setDateOrder] = useState<ImportDateOrder>('DMY');
  const [fileName, setFileName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);

  const refreshPreview = useCallback(async (
    source: ParsedCsv,
    nextMapping: CsvImportMapping,
    nextDateOrder = dateOrder
  ) => {
    const rawPreview = createCsvPreview(source, nextMapping, nextDateOrder);
    if (bookId == null) {
      setPreview(rawPreview);
      return;
    }
    setPreview(await annotateCsvDuplicates(db, bookId, rawPreview));
  }, [bookId, dateOrder, db]);

  const loadTargets = async () => {
    if (bookId == null) throw new Error('Pembukuan aktif belum siap');
    const [walletRows, categoryRows] = await Promise.all([
      new WalletQueries(db, bookId).getAll(),
      new CategoryQueries(db, bookId).getAll(),
    ]);
    setWallets(walletRows);
    setCategories(categoryRows);
    return { walletRows, categoryRows };
  };

  const handlePickFile = async () => {
    try {
      if (bookId == null) {
        Alert.alert('Belum siap', 'Pembukuan aktif belum siap. Coba lagi.');
        return;
      }
      setReading(true);
      setResult(null);
      const pickResult = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (pickResult.canceled || !pickResult.assets?.[0]) return;

      const file = pickResult.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const source = parseCsv(content);
      const detected = detectColumnMapping(source.headers);
      const { walletRows, categoryRows } = await loadTargets();
      const incomeCategories = categoryRows.filter(category => category.type === 'income');
      const expenseCategories = categoryRows.filter(category => category.type === 'expense');
      const nextMapping: CsvImportMapping = {
        ...detected,
        defaultWalletId: walletRows[0]?.id ?? null,
        defaultIncomeCategoryId: incomeCategories.find(category => category.name === 'Lainnya')?.id ?? incomeCategories[0]?.id ?? null,
        defaultExpenseCategoryId: expenseCategories.find(category => category.name === 'Lainnya')?.id ?? expenseCategories[0]?.id ?? null,
        positiveAmountType: null,
      };

      setFileName(file.name);
      setParsed(source);
      setMapping(nextMapping);
      await refreshPreview(source, nextMapping);
    } catch (error) {
      Alert.alert('Gagal membaca CSV', error instanceof Error ? error.message : 'Format file tidak valid');
    } finally {
      setReading(false);
    }
  };

  const handleMapping = async (field: MappingField, index: number | null) => {
    if (!parsed) return;
    const nextMapping = { ...mapping, [field]: index };
    setMapping(nextMapping);
    setMappingField(null);
    await refreshPreview(parsed, nextMapping);
  };

  const handleDateOrder = async (order: ImportDateOrder) => {
    if (!parsed) return;
    setDateOrder(order);
    await refreshPreview(parsed, mapping, order);
  };

  const handleTargetChange = async (
    key: 'defaultWalletId' | 'defaultIncomeCategoryId' | 'defaultExpenseCategoryId',
    value: number
  ) => {
    const nextMapping = { ...mapping, [key]: value };
    setMapping(nextMapping);
    if (parsed) await refreshPreview(parsed, nextMapping);
  };

  const toggleRow = (rowNumber: number) => {
    setPreview(current => current && ({
      ...current,
      rows: current.rows.map(row => row.rowNumber === rowNumber && row.status !== 'invalid'
        ? { ...row, selected: !row.selected }
        : row),
    }));
  };

  const handleCommit = async () => {
    if (!preview || bookId == null) return;
    try {
      setCommitting(true);
      const importResult = await commitCsvImport(db, bookId, preview, mapping);
      setResult(importResult);
      setParsed(null);
      setPreview(null);
    } catch (error) {
      Alert.alert('Impor dibatalkan', error instanceof Error ? error.message : 'Gagal menyimpan transaksi');
    } finally {
      setCommitting(false);
    }
  };

  const selectedCount = preview?.rows.filter(row => row.selected && row.status !== 'invalid').length ?? 0;
  const readyCount = preview?.rows.filter(row => row.status === 'ready').length ?? 0;
  const duplicateCount = preview?.rows.filter(row => row.status === 'duplicate').length ?? 0;
  const invalidCount = preview?.rows.filter(row => row.status === 'invalid').length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="cloud-upload-outline" size={56} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>Impor CSV Rekening Koran</Text>
      <Text style={styles.subtitle}>
        Tinjau dan petakan transaksi sebelum disimpan ke pembukuan aktif.
      </Text>

      <Button title={parsed ? 'Pilih File Lain' : 'Pilih File CSV'} onPress={handlePickFile} loading={reading} fullWidth />

      {result && (
        <Card style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Impor selesai</Text>
          <Text style={styles.resultText}>{result.imported} transaksi berhasil disimpan</Text>
          <Text style={styles.resultText}>{result.duplicates} duplikat dan {result.invalid} baris invalid dilewati</Text>
        </Card>
      )}

      {parsed && (
        <>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>{fileName || 'File CSV'}</Text>
            <Text style={styles.helperText}>{parsed.rows.length} baris, delimiter {parsed.delimiter === '\t' ? 'tab' : parsed.delimiter}</Text>

            {MAPPING_FIELDS.map(field => (
              <TouchableOpacity key={field.key} style={styles.mappingRow} onPress={() => setMappingField(field.key)}>
                <Text style={styles.mappingLabel}>{field.label}</Text>
                <View style={styles.mappingValue}>
                  <Text style={styles.mappingText}>{columnLabel(parsed.headers, mapping[field.key])}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}

            <Text style={styles.fieldLabel}>Urutan tanggal</Text>
            <View style={styles.chipRow}>
              {(['DMY', 'MDY'] as const).map(order => (
                <TouchableOpacity key={order} style={[styles.chip, dateOrder === order && styles.chipActive]} onPress={() => handleDateOrder(order)}>
                  <Text style={[styles.chipText, dateOrder === order && styles.chipTextActive]}>{order === 'DMY' ? '31/12/2026' : '12/31/2026'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Nominal positif tanpa arah dianggap</Text>
            <View style={styles.chipRow}>
              {(['expense', 'income'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, mapping.positiveAmountType === type && styles.chipActive]}
                  onPress={async () => {
                    const nextMapping = { ...mapping, positiveAmountType: type };
                    setMapping(nextMapping);
                    await refreshPreview(parsed, nextMapping);
                  }}
                >
                  <Text style={[styles.chipText, mapping.positiveAmountType === type && styles.chipTextActive]}>
                    {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Target pembukuan</Text>
            <Text style={styles.fieldLabel}>Dompet default</Text>
            <View style={styles.chipRow}>
              {wallets.map(wallet => (
                <TouchableOpacity key={wallet.id} style={[styles.chip, mapping.defaultWalletId === wallet.id && styles.chipActive]} onPress={() => handleTargetChange('defaultWalletId', wallet.id)}>
                  <Text style={[styles.chipText, mapping.defaultWalletId === wallet.id && styles.chipTextActive]}>{wallet.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Kategori pemasukan</Text>
            <View style={styles.chipRow}>
              {categories.filter(category => category.type === 'income').map(category => (
                <TouchableOpacity key={category.id} style={[styles.chip, mapping.defaultIncomeCategoryId === category.id && styles.chipActive]} onPress={() => handleTargetChange('defaultIncomeCategoryId', category.id)}>
                  <Text style={[styles.chipText, mapping.defaultIncomeCategoryId === category.id && styles.chipTextActive]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Kategori pengeluaran</Text>
            <View style={styles.chipRow}>
              {categories.filter(category => category.type === 'expense').map(category => (
                <TouchableOpacity key={category.id} style={[styles.chip, mapping.defaultExpenseCategoryId === category.id && styles.chipActive]} onPress={() => handleTargetChange('defaultExpenseCategoryId', category.id)}>
                  <Text style={[styles.chipText, mapping.defaultExpenseCategoryId === category.id && styles.chipTextActive]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.sectionTitle}>Preview transaksi</Text>
                <Text style={styles.helperText}>{selectedCount} dipilih | {readyCount} siap | {duplicateCount} duplikat | {invalidCount} invalid</Text>
              </View>
              <Ionicons name={mappingIsReady(mapping) ? 'checkmark-circle' : 'warning-outline'} size={24} color={mappingIsReady(mapping) ? theme.colors.success : theme.colors.warning} />
            </View>
            {!mappingIsReady(mapping) && <Text style={styles.warningText}>Lengkapi mapping tanggal, keterangan, nominal, dompet, dan kategori.</Text>}
            {preview?.rows.slice(0, 100).map(row => (
              <TouchableOpacity key={row.rowNumber} style={styles.previewRow} onPress={() => toggleRow(row.rowNumber)} disabled={row.status === 'invalid'}>
                <Ionicons
                  name={row.status === 'invalid' ? 'close-circle-outline' : row.selected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={row.status === 'invalid' ? theme.colors.danger : row.selected ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewDescription} numberOfLines={1}>#{row.rowNumber} {row.description || 'Tanpa keterangan'}</Text>
                  <Text style={styles.previewMeta}>{row.date || '-'} | {row.type === 'income' ? 'Pemasukan' : row.type === 'expense' ? 'Pengeluaran' : '-'}</Text>
                  {row.issues.length > 0 && <Text style={styles.errorText}>{row.issues.join(', ')}</Text>}
                  {row.status === 'duplicate' && <Text style={styles.warningText}>Duplikat, tap untuk tetap mengimpor</Text>}
                </View>
                <Text style={[styles.previewAmount, { color: row.type === 'income' ? theme.colors.income : theme.colors.expense }]}>
                  {row.amount == null ? '-' : `${row.type === 'income' ? '+' : '-'}${formatRupiah(row.amount)}`}
                </Text>
              </TouchableOpacity>
            ))}
            {(preview?.rows.length || 0) > 100 && <Text style={styles.helperText}>Menampilkan 100 baris pertama.</Text>}
            <Button title={`Impor ${selectedCount} transaksi`} onPress={handleCommit} loading={committing} disabled={!mappingIsReady(mapping) || selectedCount === 0} fullWidth />
          </Card>
        </>
      )}

      <Modal visible={mappingField !== null} transparent animationType="fade" onRequestClose={() => setMappingField(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Pilih kolom {MAPPING_FIELDS.find(field => field.key === mappingField)?.label}</Text>
            <TouchableOpacity style={styles.columnOption} onPress={() => mappingField && handleMapping(mappingField, null)}>
              <Text style={styles.columnText}>Tidak dipilih</Text>
            </TouchableOpacity>
            {parsed?.headers.map((header, index) => (
              <TouchableOpacity key={`${header}-${index}`} style={styles.columnOption} onPress={() => mappingField && handleMapping(mappingField, index)}>
                <Text style={styles.columnText}>{header || `Kolom ${index + 1}`}</Text>
              </TouchableOpacity>
            ))}
            <Button title="Batal" variant="ghost" onPress={() => setMappingField(null)} fullWidth />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, alignItems: 'center', paddingBottom: theme.spacing.xl },
  iconContainer: { width: 92, height: 92, borderRadius: 46, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  title: { ...theme.typography.h2, textAlign: 'center', marginBottom: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg, lineHeight: 20 },
  card: { width: '100%', marginTop: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  resultCard: { width: '100%', marginTop: theme.spacing.md, backgroundColor: theme.colors.surfaceElevated },
  sectionTitle: { ...theme.typography.subtitle, marginBottom: theme.spacing.xs },
  helperText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  resultText: { ...theme.typography.bodySmall, marginTop: 2 },
  mappingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mappingLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  mappingValue: { flexDirection: 'row', alignItems: 'center', maxWidth: '62%', gap: 4 },
  mappingText: { ...theme.typography.bodySmall, fontWeight: '600', textAlign: 'right' },
  fieldLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: { paddingHorizontal: theme.spacing.sm, paddingVertical: 7, borderRadius: theme.radius.round, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textOnPrimary, fontWeight: '600' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  warningText: { ...theme.typography.caption, color: theme.colors.warning, marginTop: 4 },
  errorText: { ...theme.typography.caption, color: theme.colors.danger, marginTop: 2 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  previewInfo: { flex: 1 },
  previewDescription: { ...theme.typography.bodySmall, fontWeight: '600' },
  previewMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  previewAmount: { ...theme.typography.caption, fontWeight: '600', maxWidth: 100, textAlign: 'right' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: { maxHeight: '80%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  columnOption: { paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  columnText: { ...theme.typography.body },
});

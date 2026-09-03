import { SQLiteDatabase } from 'expo-sqlite';
import {
  CsvColumnMapping,
  ParsedCsv,
  ParsedCsvRow,
} from './csvParser';
import { insertTransactionWithBalance } from '@/lib/queries';
import { TransactionType } from '@/types';

export type ImportDateOrder = 'DMY' | 'MDY';

export interface CsvImportMapping extends CsvColumnMapping {
  defaultWalletId: number | null;
  defaultIncomeCategoryId: number | null;
  defaultExpenseCategoryId: number | null;
  positiveAmountType: TransactionType | null;
}

export type CsvPreviewStatus = 'ready' | 'invalid' | 'duplicate';

export interface CsvPreviewRow {
  rowNumber: number;
  values: string[];
  date: string | null;
  description: string;
  amount: number | null;
  type: TransactionType | null;
  status: CsvPreviewStatus;
  issues: string[];
  fingerprint: string | null;
  selected: boolean;
}

export interface CsvPreview {
  headers: string[];
  delimiter: ParsedCsv['delimiter'];
  rows: CsvPreviewRow[];
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  invalid: number;
}

const MONTHS: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agu: 8, agt: 8, aug: 8,
  september: 9, sep: 9,
  oktober: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12,
};

function dateFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseImportDate(value: string, order: ImportDateOrder = 'DMY'): string | null {
  const input = value.trim().replace(/\u00a0/g, ' ');
  if (!input) return null;

  const iso = input.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (iso) return dateFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = input.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[T\s].*)?$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    return order === 'MDY'
      ? dateFromParts(Number(numeric[3]), first, second)
      : dateFromParts(Number(numeric[3]), second, first);
  }

  const named = input.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})(?:[T\s].*)?$/i);
  if (named) return dateFromParts(Number(named[3]), MONTHS[named[2]], Number(named[1]));
  return null;
}

export interface ParsedImportAmount {
  amount: number;
  sign: 1 | -1;
  directionHint: TransactionType | null;
}

export function parseImportAmount(value: string): ParsedImportAmount | null {
  const original = value.trim().replace(/\u00a0/g, ' ');
  if (!original) return null;

  const upper = original.toUpperCase();
  const directionHint: TransactionType | null = /\b(DB|DEBIT|DEBET)\b/.test(upper)
    ? 'expense'
    : /\b(CR|CREDIT|KREDIT)\b/.test(upper)
      ? 'income'
      : null;
  const negative = /^\s*-/.test(original) || /^\s*\(/.test(original);
  let numeric = original
    .replace(/IDR|RP\.?/gi, '')
    .replace(/\b(DB|DEBIT|DEBET|CR|CREDIT|KREDIT)\b/gi, '')
    .replace(/[()\s+]/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!numeric) return null;

  const lastComma = numeric.lastIndexOf(',');
  const lastDot = numeric.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    } else {
      numeric = numeric.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    const decimals = numeric.length - lastComma - 1;
    numeric = decimals > 0 && decimals <= 2
      ? numeric.replace(',', '.')
      : numeric.replace(/,/g, '');
  } else if ((numeric.match(/\./g) || []).length > 1) {
    const decimals = numeric.length - lastDot - 1;
    numeric = decimals > 0 && decimals <= 2
      ? `${numeric.slice(0, lastDot).replace(/\./g, '')}.${numeric.slice(lastDot + 1)}`
      : numeric.replace(/\./g, '');
  } else if (lastDot >= 0) {
    const decimals = numeric.length - lastDot - 1;
    if (decimals === 3) numeric = numeric.replace('.', '');
  }

  const amount = Math.abs(Number(numeric));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, sign: negative ? -1 : 1, directionHint };
}

export function normalizeImportText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function importFingerprint(
  date: string,
  type: TransactionType,
  amount: number,
  description: string
): string {
  return [date, type, Math.round(amount * 100), normalizeImportText(description)].join('|');
}

function valueAt(row: ParsedCsvRow, column: number | null): string {
  return column == null ? '' : row.values[column] || '';
}

function directionFromText(value: string): TransactionType | null {
  const normalized = normalizeImportText(value);
  if (!normalized) return null;
  if (/(debit|debet|db|keluar|pengeluaran|expense)/i.test(normalized)) return 'expense';
  if (/(credit|kredit|cr|masuk|pemasukan|income)/i.test(normalized)) return 'income';
  return null;
}

export function createCsvPreview(
  parsed: ParsedCsv,
  mapping: CsvImportMapping,
  dateOrder: ImportDateOrder = 'DMY'
): CsvPreview {
  const rows = parsed.rows.map(row => {
    const issues: string[] = [];
    const rawDate = valueAt(row, mapping.date);
    const date = mapping.date == null ? null : parseImportDate(rawDate, dateOrder);
    const description = valueAt(row, mapping.description).trim();
    let amount: number | null = null;
    let type: TransactionType | null = null;

    if (mapping.date == null) issues.push('Kolom tanggal belum dipilih');
    else if (!date) issues.push('Tanggal tidak valid');
    if (mapping.description == null) issues.push('Kolom keterangan belum dipilih');
    else if (!description) issues.push('Keterangan kosong');

    const amountValue = mapping.amount == null ? null : parseImportAmount(valueAt(row, mapping.amount));
    const debitValue = mapping.debit == null ? null : parseImportAmount(valueAt(row, mapping.debit));
    const creditValue = mapping.credit == null ? null : parseImportAmount(valueAt(row, mapping.credit));

    const hasDebit = debitValue && debitValue.amount > 0;
    const hasCredit = creditValue && creditValue.amount > 0;
    if (hasDebit && hasCredit) {
      issues.push('Kolom debit dan kredit terisi bersamaan');
    } else if (hasDebit) {
      amount = debitValue!.amount;
      type = 'expense';
    } else if (hasCredit) {
      amount = creditValue!.amount;
      type = 'income';
    } else if (mapping.amount == null) {
      issues.push('Kolom nominal belum dipilih');
    } else if (!amountValue) {
      issues.push('Nominal tidak valid');
    } else {
      amount = amountValue.amount;
      type = mapping.direction == null ? null : directionFromText(valueAt(row, mapping.direction));
      type = type || amountValue.directionHint;
      type = type || (amountValue.sign < 0 ? 'expense' : mapping.positiveAmountType);
      if (!type) issues.push('Arah transaksi belum jelas');
    }

    if (mapping.direction != null && !type && valueAt(row, mapping.direction).trim()) {
      issues.push('Nilai arah transaksi tidak dikenali');
    }

    const fingerprint = date && type && amount
      ? importFingerprint(date, type, amount, description)
      : null;
    return {
      rowNumber: row.rowNumber,
      values: row.values,
      date,
      description,
      amount,
      type,
      status: issues.length > 0 ? 'invalid' : 'ready',
      issues,
      fingerprint,
      selected: issues.length === 0,
    } satisfies CsvPreviewRow;
  });

  return { headers: parsed.headers, delimiter: parsed.delimiter, rows };
}

export async function annotateCsvDuplicates(
  db: SQLiteDatabase,
  bookId: number,
  preview: CsvPreview
): Promise<CsvPreview> {
  const existing = await db.getAllAsync<{ transaction_date: string; type: TransactionType; amount: number; notes: string | null }>(
    'SELECT transaction_date, type, amount, notes FROM transactions WHERE book_id = ?',
    [bookId]
  );
  const existingKeys = new Set(
    existing.map(row => importFingerprint(row.transaction_date, row.type, row.amount, row.notes || ''))
  );
  const seen = new Set<string>();

  return {
    ...preview,
    rows: preview.rows.map(row => {
      if (row.status === 'invalid' || !row.fingerprint) return { ...row, selected: false };
      const duplicate = existingKeys.has(row.fingerprint) || seen.has(row.fingerprint);
      seen.add(row.fingerprint);
      return {
        ...row,
        status: duplicate ? 'duplicate' : 'ready',
        selected: duplicate ? false : row.selected,
      };
    }),
  };
}

export async function commitCsvImport(
  db: SQLiteDatabase,
  bookId: number,
  preview: CsvPreview,
  mapping: CsvImportMapping
): Promise<CsvImportResult> {
  const selected = preview.rows.filter(row => row.selected && row.status !== 'invalid');
  if (selected.length === 0) throw new Error('Pilih minimal satu transaksi yang valid');
  if (!mapping.defaultWalletId || !mapping.defaultIncomeCategoryId || !mapping.defaultExpenseCategoryId) {
    throw new Error('Dompet dan kategori default harus dipilih');
  }
  const defaultWalletId = mapping.defaultWalletId;
  const defaultIncomeCategoryId = mapping.defaultIncomeCategoryId;
  const defaultExpenseCategoryId = mapping.defaultExpenseCategoryId;

  const existing = await db.getAllAsync<{ transaction_date: string; type: TransactionType; amount: number; notes: string | null }>(
    'SELECT transaction_date, type, amount, notes FROM transactions WHERE book_id = ?',
    [bookId]
  );
  const existingKeys = new Set(
    existing.map(row => importFingerprint(row.transaction_date, row.type, row.amount, row.notes || ''))
  );
  const fileKeys = new Set<string>();
  let imported = 0;

  await db.withTransactionAsync(async () => {
    for (const row of selected) {
      if (!row.date || !row.type || !row.amount || !row.fingerprint) {
        throw new Error(`Baris ${row.rowNumber} tidak valid`);
      }

      const duplicateWasReviewed = row.status === 'duplicate';
      if (!duplicateWasReviewed && existingKeys.has(row.fingerprint)) {
        throw new Error(`Data berubah: baris ${row.rowNumber} menjadi duplikat`);
      }
      if (!duplicateWasReviewed && fileKeys.has(row.fingerprint)) {
        throw new Error(`Duplikat dalam file pada baris ${row.rowNumber}`);
      }

      await insertTransactionWithBalance(db, bookId, {
        type: row.type,
        amount: row.amount,
        category_id: row.type === 'income' ? defaultIncomeCategoryId : defaultExpenseCategoryId,
        wallet_id: defaultWalletId,
        transaction_date: row.date,
        notes: row.description || null,
        recurring_id: null,
        transfer_id: null,
      });
      fileKeys.add(row.fingerprint);
      imported++;
    }
  });

  const invalid = preview.rows.filter(row => row.status === 'invalid').length;
  const duplicates = preview.rows.filter(row => row.status === 'duplicate').length;
  return { imported, skipped: preview.rows.length - imported, duplicates, invalid };
}

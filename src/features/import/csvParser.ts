export interface ParsedCsvRow {
  rowNumber: number;
  values: string[];
}

export interface ParsedCsv {
  headers: string[];
  rows: ParsedCsvRow[];
  delimiter: ',' | ';' | '\t';
}

export interface CsvColumnMapping {
  date: number | null;
  description: number | null;
  amount: number | null;
  direction: number | null;
  debit: number | null;
  credit: number | null;
  category: number | null;
  wallet: number | null;
}

const DELIMITERS = [',', ';', '\t'] as const;

function countDelimiter(text: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      count++;
    }
  }
  return count;
}

export function detectCsvDelimiter(content: string): ParsedCsv['delimiter'] {
  const sample = content.replace(/^\uFEFF/, '').slice(0, 32_000);
  return DELIMITERS.reduce((best, candidate) =>
    countDelimiter(sample, candidate) > countDelimiter(sample, best) ? candidate : best
  , ',');
}

export function parseCsv(content: string, delimiter = detectCsvDelimiter(content)): ParsedCsv {
  const source = content.replace(/^\uFEFF/, '');
  const rows: ParsedCsvRow[] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowStart = 1;

  const pushField = () => {
    fields.push(field.trim());
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (fields.some(value => value.length > 0)) {
      rows.push({ rowNumber: rowStart, values: fields });
    }
    fields = [];
    rowStart = line + 1;
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      pushField();
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      pushRow();
      if (char === '\r' && source[i + 1] === '\n') i++;
      line++;
      continue;
    }

    field += char;
    if (char === '\n') line++;
  }

  if (quoted) throw new Error('CSV memiliki tanda kutip yang belum ditutup');
  if (field.length > 0 || fields.length > 0) pushRow();
  if (rows.length < 2) throw new Error('File CSV kosong atau hanya memiliki header');

  return {
    headers: rows[0].values,
    rows: rows.slice(1),
    delimiter,
  };
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findHeader(headers: string[], aliases: string[]): number | null {
  const normalized = headers.map(normalizeHeader);
  const aliasValues = aliases.map(normalizeHeader);
  const exact = normalized.findIndex(value => aliasValues.includes(value));
  if (exact >= 0) return exact;
  const partial = normalized.findIndex(value => aliasValues.some(alias => value.includes(alias)));
  return partial >= 0 ? partial : null;
}

export function detectColumnMapping(headers: string[]): CsvColumnMapping {
  return {
    date: findHeader(headers, ['tanggal', 'tgl', 'date', 'transactiondate', 'tanggaltransaksi']),
    description: findHeader(headers, ['keterangan', 'uraian', 'deskripsi', 'description', 'desc', 'memo', 'detail']),
    amount: findHeader(headers, ['jumlah', 'nominal', 'mutasi', 'amount', 'nilai', 'transactionamount']),
    direction: findHeader(headers, ['tipe', 'type', 'jenis', 'posisi', 'direction', 'debitcredit']),
    debit: findHeader(headers, ['debit', 'debet', 'pengeluaran', 'keluar']),
    credit: findHeader(headers, ['credit', 'kredit', 'pemasukan', 'masuk']),
    category: findHeader(headers, ['kategori', 'category']),
    wallet: findHeader(headers, ['rekening', 'akun', 'account', 'wallet', 'nomorrekening']),
  };
}

export function columnLabel(headers: string[], index: number | null): string {
  return index == null ? 'Tidak dipilih' : headers[index] || `Kolom ${index + 1}`;
}

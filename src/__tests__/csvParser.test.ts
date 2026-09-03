import { parseImportAmount, parseImportDate, importFingerprint } from '@/features/import/csvImportService';
import {
  detectColumnMapping,
  detectCsvDelimiter,
  parseCsv,
} from '@/features/import/csvParser';

describe('parseCsv', () => {
  it('membaca quoted field dengan koma dan baris baru', () => {
    const csv = 'Tanggal;Keterangan;Jumlah\n"01/02/2026";"Makan, siang";10.000\n"02/02/2026";"Catatan\nbaru";20.000\n';
    const parsed = parseCsv(csv, ';');
    expect(parsed.headers).toEqual(['Tanggal', 'Keterangan', 'Jumlah']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].values[1]).toBe('Makan, siang');
    expect(parsed.rows[1].values[1]).toBe('Catatan\nbaru');
  });

  it('mendeteksi delimiter dari isi file dan membuang BOM', () => {
    const csv = '\uFEFFA;B\n1;2\n3;4\n';
    expect(detectCsvDelimiter(csv)).toBe(';');
    const parsed = parseCsv(csv);
    expect(parsed.headers[0]).toBe('A');
    expect(parsed.rows).toHaveLength(2);
  });

  it('menolak tanda kutip yang tidak ditutup', () => {
    expect(() => parseCsv('A,B\n"abc,1\n')).toThrow('kutip');
  });
});

describe('detectColumnMapping', () => {
  it('mengenali kolom tanggal, keterangan, jumlah, dan tipe', () => {
    const mapping = detectColumnMapping(['Tanggal', 'Keterangan', 'Jumlah', 'Tipe']);
    expect(mapping.date).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.amount).toBe(2);
    expect(mapping.direction).toBe(3);
  });

  it('tidak memilih kolom yang tidak dikenal', () => {
    const mapping = detectColumnMapping(['A', 'B']);
    expect(mapping.date).toBeNull();
    expect(mapping.amount).toBeNull();
  });
});

describe('parseImportDate', () => {
  it('mengurai format DD/MM/YYYY default (Indonesia)', () => {
    expect(parseImportDate('31/12/2026')).toBe('2026-12-31');
    expect(parseImportDate('01-02-2026')).toBe('2026-02-01');
    expect(parseImportDate('2026-12-31 23:59')).toBe('2026-12-31');
  });

  it('mendukung nama bulan Indonesia', () => {
    expect(parseImportDate('31 Des 2026')).toBe('2026-12-31');
  });

  it('menolak tanggal mustahil', () => {
    expect(parseImportDate('31/02/2026')).toBeNull();
  });
});

describe('parseImportAmount', () => {
  it('mengurai format Rupiah dan desimal koma', () => {
    const result = parseImportAmount('Rp 1.234.567,50');
    expect(result?.amount).toBeCloseTo(1234567.5, 2);
  });

  it('mengenali tanda minus dan kurung sebagai pengeluaran', () => {
    expect(parseImportAmount('-500.000')).toEqual({ amount: 500000, sign: -1, directionHint: null });
    expect(parseImportAmount('(500.000)')?.sign).toBe(-1);
  });

  it('mengenali sufiks DB dan CR', () => {
    expect(parseImportAmount('50.000 DB')?.directionHint).toBe('expense');
    expect(parseImportAmount('50.000 CR')?.directionHint).toBe('income');
  });

  it('mengembalikan null untuk nilai tidak valid', () => {
    expect(parseImportAmount('abc')).toBeNull();
    expect(parseImportAmount('')).toBeNull();
  });
});

describe('importFingerprint', () => {
  it('menormalkan deskripsi dan jumlah', () => {
    expect(importFingerprint('2026-01-01', 'expense', 10000, '  Alfamart '))
      .toBe(importFingerprint('2026-01-01', 'expense', 10000, 'alfamart'));
    expect(importFingerprint('2026-01-01', 'expense', 10000, 'x'))
      .not.toBe(importFingerprint('2026-01-02', 'expense', 10000, 'x'));
  });
});

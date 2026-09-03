import { parseCsv } from '@/features/import/csvParser';
import {
  annotateCsvDuplicates,
  commitCsvImport,
  createCsvPreview,
  CsvImportMapping,
} from '@/features/import/csvImportService';

const SAMPLE = [
  'Tanggal;Keterangan;Jumlah;Tipe',
  '01/02/2026;Alfamart;-50.000;Debit',
  '02/02/2026;Gaji;5.000.000;Kredit',
  '03/02/2026;Duplikat;10.000;Debit',
].join('\n');

function makeMapping(): CsvImportMapping {
  return {
    date: 0,
    description: 1,
    amount: 2,
    direction: 3,
    debit: null,
    credit: null,
    category: null,
    wallet: null,
    defaultWalletId: 1,
    defaultIncomeCategoryId: 2,
    defaultExpenseCategoryId: 3,
    positiveAmountType: null,
  };
}

function makeDb(existingTransactions: any[] = []) {
  const inserted: any[][] = [];
  const db: any = {
    getAllAsync: jest.fn().mockResolvedValue(existingTransactions),
    getFirstAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      if (String(sql).includes('FROM wallets')) return Promise.resolve({ id: params[0] });
      if (String(sql).includes('FROM categories')) return Promise.resolve({ id: params[0] });
      return Promise.resolve(null);
    }),
    runAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
      if (String(sql).includes('INSERT INTO transactions')) {
        inserted.push(params);
        return Promise.resolve({ lastInsertRowId: inserted.length, changes: 1 });
      }
      return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => { await fn(); }),
  };
  return { db, inserted };
}

describe('createCsvPreview', () => {
  it('menandai arah transaksi dari kolom tipe', () => {
    const parsed = parseCsv(SAMPLE, ';');
    const preview = createCsvPreview(parsed, makeMapping());

    expect(preview.rows[0].type).toBe('expense');
    expect(preview.rows[0].date).toBe('2026-02-01');
    expect(preview.rows[0].amount).toBe(50000);
    expect(preview.rows[1].type).toBe('income');
    expect(preview.rows[1].amount).toBe(5000000);
    expect(preview.rows[0].selected).toBe(true);
  });
});

describe('annotateCsvDuplicates', () => {
  it('menandai duplikat terhadap data yang sudah ada', async () => {
    const parsed = parseCsv(SAMPLE, ';');
    const preview = createCsvPreview(parsed, makeMapping());
    const db = makeDb([
      { transaction_date: '2026-02-03', type: 'expense', amount: 10000, notes: 'Duplikat' },
    ]).db;

    const result = await annotateCsvDuplicates(db, 1, preview);
    const duplicate = result.rows.find(row => row.description === 'Duplikat');
    expect(duplicate?.status).toBe('duplicate');
    expect(duplicate?.selected).toBe(false);
  });
});

describe('commitCsvImport', () => {
  it('menyimpan batch dalam satu transaksi dan mengembalikan ringkasan', async () => {
    const parsed = parseCsv(SAMPLE, ';');
    const mapping = makeMapping();
    const preview = createCsvPreview(parsed, mapping);
    const { db, inserted } = makeDb([]);

    const result = await commitCsvImport(db, 1, preview, mapping);

    expect(result.imported).toBe(3);
    expect(inserted).toHaveLength(3);
    expect(inserted[0][0]).toBe('expense');
    expect(inserted[0][7]).toBe(1); // book_id
    expect(inserted[1][0]).toBe('income');
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('tidak menulis apa pun bila tidak ada baris valid terpilih', async () => {
    const parsed = parseCsv('A;B;C;D\nx;y;z;q\n', ';');
    const preview = createCsvPreview(parsed, makeMapping());
    const { db, inserted } = makeDb([]);

    await expect(commitCsvImport(db, 1, preview, makeMapping())).rejects.toThrow('Pilih minimal satu');
    expect(inserted).toHaveLength(0);
  });

  it('rollback total saat salah satu baris gagal', async () => {
    const parsed = parseCsv(SAMPLE, ';');
    const mapping = makeMapping();
    const preview = createCsvPreview(parsed, mapping);
    const { db } = makeDb([]);
    db.runAsync = jest.fn().mockImplementation((sql: string) => {
      if (String(sql).includes('INSERT INTO transactions')) {
        throw new Error('disk penuh');
      }
      return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
    });

    await expect(commitCsvImport(db, 1, preview, mapping)).rejects.toThrow('disk penuh');
  });
});

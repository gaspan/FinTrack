import {
  isTransferCategoryName,
  ChartQueries,
  TrendQueries,
} from '@/lib/queries';

describe('isTransferCategoryName', () => {
  it('mendeteksi berbagai variasi nama kategori transfer antar rekening', () => {
    expect(isTransferCategoryName('Transfer Antar Rekening')).toBe(true);
    expect(isTransferCategoryName('transfer antar rekening')).toBe(true);
    expect(isTransferCategoryName('TRANSFER ANTAR REKENING')).toBe(true);
    expect(isTransferCategoryName('Transfer Antar-Rekening')).toBe(true);
    expect(isTransferCategoryName('Transfer Antar Dompet')).toBe(true);
    expect(isTransferCategoryName('transfer antar-dompet')).toBe(true);
    expect(isTransferCategoryName('Transfer Antar Bank')).toBe(true);
    expect(isTransferCategoryName('Transfer Antar-Bank')).toBe(true);
    expect(isTransferCategoryName('Transfer Rekening')).toBe(true);
    expect(isTransferCategoryName('Transfer Antar Akun')).toBe(true);
    expect(isTransferCategoryName('Transfer')).toBe(true);
    expect(isTransferCategoryName('transfer')).toBe(true);
    expect(isTransferCategoryName('Transfer Dana')).toBe(true);
    expect(isTransferCategoryName('Transfer Saldo')).toBe(true);
    expect(isTransferCategoryName('Transfer Masuk')).toBe(true);
    expect(isTransferCategoryName('Transfer Keluar')).toBe(true);
  });

  it('TIDAK mengecualikan biaya admin / fee transfer (harus tetap dihitung sebagai pengeluaran riil)', () => {
    expect(isTransferCategoryName('Biaya Transfer')).toBe(false);
    expect(isTransferCategoryName('Biaya Admin Transfer')).toBe(false);
    expect(isTransferCategoryName('biaya transfer antar bank')).toBe(false);
    expect(isTransferCategoryName('Fee Transfer')).toBe(false);
    expect(isTransferCategoryName('Admin Transfer')).toBe(false);
  });

  it('TIDAK mengecualikan kategori pengeluaran dan pemasukan reguler lainnya', () => {
    expect(isTransferCategoryName('Kebutuhan Makan')).toBe(false);
    expect(isTransferCategoryName('Transportasi')).toBe(false);
    expect(isTransferCategoryName('Gaji')).toBe(false);
    expect(isTransferCategoryName('Investasi (Profit)')).toBe(false);
    expect(isTransferCategoryName('Jajan/Hiburan')).toBe(false);
    expect(isTransferCategoryName('Lainnya')).toBe(false);
    expect(isTransferCategoryName('')).toBe(false);
    expect(isTransferCategoryName(null)).toBe(false);
    expect(isTransferCategoryName(undefined)).toBe(false);
  });
});

describe('ChartQueries & TrendQueries SQL Filters', () => {
  function makeMockDb() {
    const executedSql: { sql: string; params: any[] }[] = [];
    const db: any = {
      getAllAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
        executedSql.push({ sql, params });
        return Promise.resolve([]);
      }),
      getFirstAsync: jest.fn().mockImplementation((sql: string, params: any[]) => {
        executedSql.push({ sql, params });
        return Promise.resolve({ total: 0 });
      }),
    };
    return { db, executedSql };
  }

  it('ChartQueries.getCategoryBreakdown menyertakan klausa EXCLUDE_TRANSFER_CATEGORY_SQL', async () => {
    const { db, executedSql } = makeMockDb();
    const queries = new ChartQueries(db, 1);
    await queries.getCategoryBreakdown('2026-03-01', '2026-03-31', 'expense');

    expect(executedSql).toHaveLength(1);
    const { sql, params } = executedSql[0];
    expect(sql).toContain('transfer_id IS NULL');
    expect(sql).toContain('is_internal = 0');
    expect(sql).toContain('transfer antar rekening');
    expect(params).toEqual([1, 'expense', '2026-03-01', '2026-03-31']);
  });

  it('ChartQueries.getSummary melakukan LEFT JOIN categories dan mengecualikan kategori transfer', async () => {
    const { db, executedSql } = makeMockDb();
    const queries = new ChartQueries(db, 1);
    await queries.getSummary('2026-03-01', '2026-03-31');

    expect(executedSql).toHaveLength(2); // 1 untuk income, 1 untuk expense
    for (const exec of executedSql) {
      expect(exec.sql).toContain('LEFT JOIN categories c');
      expect(exec.sql).toContain('transfer_id IS NULL');
      expect(exec.sql).toContain('transfer antar rekening');
      expect(exec.sql).toContain('NOT LIKE');
    }
  });

  it('TrendQueries.getMonthlyTrend dan getCashFlow mengecualikan kategori transfer', async () => {
    const { db, executedSql } = makeMockDb();
    const queries = new TrendQueries(db, 1);
    await queries.getMonthlyTrend(6);
    await queries.getCashFlow();

    expect(executedSql).toHaveLength(2);
    // getMonthlyTrend
    expect(executedSql[0].sql).toContain('LEFT JOIN categories c');
    expect(executedSql[0].sql).toContain('transfer_id IS NULL');
    expect(executedSql[0].sql).toContain('transfer antar rekening');
    // getCashFlow
    expect(executedSql[1].sql).toContain('LEFT JOIN categories c');
    expect(executedSql[1].sql).toContain('transfer_id IS NULL');
    expect(executedSql[1].sql).toContain('transfer antar rekening');
  });
});

import { parseReceiptText, parseIndonesianAmount } from '@/utils/receiptParser';

describe('parseIndonesianAmount', () => {
  it('parses dot thousand separators', () => {
    expect(parseIndonesianAmount('15.000')).toBe(15000);
    expect(parseIndonesianAmount('150.000')).toBe(150000);
    expect(parseIndonesianAmount('1.250.000')).toBe(1250000);
  });

  it('parses Rp prefix and ",-" suffix', () => {
    expect(parseIndonesianAmount('Rp 15.000,-')).toBe(15000);
    expect(parseIndonesianAmount('Rp150.000')).toBe(150000);
  });

  it('parses decimal comma', () => {
    expect(parseIndonesianAmount('1.250.000,00')).toBe(1250000);
  });
});

describe('parseReceiptText', () => {
  it('parses Indomaret-style receipt', () => {
    const raw = [
      'INDOMARET',
      'Jl. Tebet Raya No. 12',
      '12/08/2025 14:32',
      'Indomie Goreng 3.500',
      'Aqua 600ml 4.000',
      'TOTAL BELANJA Rp 15.000',
      'TUNAI Rp 20.000',
      'KEMBALI Rp 5.000',
    ].join('\n');
    const res = parseReceiptText(raw);
    expect(res.amount).toBe(15000);
    expect(res.date?.getFullYear()).toBe(2025);
    expect(res.date?.getMonth()).toBe(7);
    expect(res.merchantName).toMatch(/INDOMARET/i);
  });

  it('prefers GRAND TOTAL over TUNAI/KEMBALI (resto)', () => {
    const raw = [
      'WARUNG BU TITIN',
      '28-08-2025',
      'Nasi Campur 25.000',
      'Es Teh 5.000',
      'GRAND TOTAL: Rp 30.000',
      'TUNAI 50.000',
      'KEMBALI 20.000',
    ].join('\n');
    expect(parseReceiptText(raw).amount).toBe(30000);
  });

  it('parses SPBU total with YYYY-MM-DD date', () => {
    const raw = [
      'SPBU 34-12345',
      '2025-08-20 09:15',
      'PERTALITE 10L',
      'TOTAL Rp 100.000',
    ].join('\n');
    const res = parseReceiptText(raw);
    expect(res.amount).toBe(100000);
    expect(res.date?.getDate()).toBe(20);
  });

  it('parses Indonesian month name date', () => {
    const res = parseReceiptText(['TOKO ABC', '12 Agu 2025', 'TOTAL 25.000'].join('\n'));
    expect(res.date?.getMonth()).toBe(7);
    expect(res.date?.getDate()).toBe(12);
  });

  it('returns nulls for empty/unreadable text', () => {
    expect(parseReceiptText('')).toEqual({ amount: null, date: null, merchantName: null, rawText: '' });
    expect(parseReceiptText('   \n  ').amount).toBeNull();
  });

  it('keeps rawText for debugging', () => {
    const raw = 'ALFAMART\nTOTAL Rp 10.000';
    expect(parseReceiptText(raw).rawText).toBe(raw);
  });
});

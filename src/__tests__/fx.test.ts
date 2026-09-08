import { parseFrankfurterSeries } from '@/features/fx/usdIdr';

describe('parseFrankfurterSeries', () => {
  it('mengurutkan tanggal dan membuang data invalid', () => {
    const points = parseFrankfurterSeries({
      rates: {
        '2026-09-03': { IDR: 17647 },
        '2026-09-01': { IDR: 17745 },
        '2026-09-02': { IDR: 'rusak' },
        'bukan-tanggal': { IDR: 17000 },
      },
    });
    expect(points).toEqual([
      { date: '2026-09-01', rate: 17745 },
      { date: '2026-09-03', rate: 17647 },
    ]);
  });

  it('kosong untuk respons tak valid', () => {
    expect(parseFrankfurterSeries(null)).toEqual([]);
    expect(parseFrankfurterSeries({ rates: null })).toEqual([]);
  });
});

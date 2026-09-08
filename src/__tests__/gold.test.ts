import { parseYahooResponse, toIdrPerGram } from '@/features/gold/goldPrice';

const sample = {
  chart: {
    result: [
      {
        timestamp: [1785772800, 1785859200, 1785945600],
        indicators: { quote: [{ close: [4400.5, null, 4441.1] }] },
      },
    ],
    error: null,
  },
};

describe('parseYahooResponse', () => {
  it('melewati close null dan memformat tanggal', () => {
    const points = parseYahooResponse(sample);
    expect(points).toHaveLength(2);
    expect(points[0].usdPerOunce).toBe(4400.5);
    expect(points[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(points[1].usdPerOunce).toBe(4441.1);
  });

  it('kosong untuk respons error', () => {
    expect(parseYahooResponse({ chart: { result: null, error: {} } })).toEqual([]);
    expect(parseYahooResponse(null)).toEqual([]);
  });
});

describe('toIdrPerGram', () => {
  it('mengonversi USD/oz ke IDR/gram', () => {
    // 3100 USD/oz @ 16000 = 49.600.000/oz ≈ 1.594.676/gram
    expect(Math.round(toIdrPerGram(3100, 16000))).toBe(1594676);
  });
});

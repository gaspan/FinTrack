import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

export type FxRange = '1M' | '3M' | '6M';

export interface FxPoint {
  /** YYYY-MM-DD */
  date: string;
  rate: number;
}

export interface FxSeries {
  points: FxPoint[];
  last: number;
  /** % perubahan titik terakhir vs titik pertama */
  changePct: number;
  fetchedAt: number;
}

export const FX_RANGES: { key: FxRange; label: string; months: number }[] = [
  { key: '1M', label: '1B', months: 1 },
  { key: '3M', label: '3B', months: 3 },
  { key: '6M', label: '6B', months: 6 },
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const UA = 'Mozilla/5.0 (Linux; Android 14) FinTrack/1.0';

export const parseFrankfurterSeries = (json: any): FxPoint[] => {
  const rates = json?.rates;
  if (rates == null || typeof rates !== 'object') return [];
  return Object.entries(rates)
    .map(([date, v]: [string, any]) => ({ date, rate: Number(v?.IDR ?? v) }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.rate) && p.rate > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

export const getUsdIdrSeries = async (range: FxRange): Promise<FxSeries> => {
  const cacheKey = `fx_series_USDIDR_${range}`;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw != null) {
      const cached = JSON.parse(raw) as FxSeries;
      if (Array.isArray(cached.points) && cached.points.length > 1 && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached;
      }
    }
  } catch {
    // abaikan cache rusak
  }

  const entry = FX_RANGES.find((r) => r.key === range) ?? FX_RANGES[1];
  const end = dayjs().format('YYYY-MM-DD');
  const start = dayjs().subtract(entry.months, 'month').format('YYYY-MM-DD');
  const res = await fetch(`https://api.frankfurter.app/${start}..${end}?from=USD&to=IDR`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Kurs ${res.status}`);
  const points = parseFrankfurterSeries(await res.json());
  if (points.length < 2) throw new Error('Data kurs kosong');

  const first = points[0].rate;
  const last = points[points.length - 1].rate;
  const series: FxSeries = {
    points,
    last,
    changePct: first > 0 ? ((last - first) / first) * 100 : 0,
    fetchedAt: Date.now(),
  };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(series)).catch(() => {});
  return series;
};

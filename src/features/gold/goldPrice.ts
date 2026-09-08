import AsyncStorage from '@react-native-async-storage/async-storage';

export type GoldRange = '1M' | '3M' | '6M';

export interface GoldPoint {
  /** YYYY-MM-DD */
  date: string;
  /** USD per troy ounce */
  usdPerOunce: number;
}

export interface GoldSeries {
  points: GoldPoint[];
  /** IDR per gram untuk titik terakhir */
  lastIdrPerGram: number;
  /** % perubahan titik terakhir vs titik pertama */
  changePct: number;
  usdIdr: number;
  fetchedAt: number;
}

export const GOLD_RANGES: { key: GoldRange; label: string; yahooRange: string }[] = [
  { key: '1M', label: '1B', yahooRange: '1mo' },
  { key: '3M', label: '3B', yahooRange: '3mo' },
  { key: '6M', label: '6B', yahooRange: '6mo' },
];

const TROY_OUNCE_GRAMS = 31.1035;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const UA = 'Mozilla/5.0 (Linux; Android 14) FinTrack/1.0';

/** USD/oz -> IDR/gram */
export const toIdrPerGram = (usdPerOunce: number, usdIdr: number): number =>
  (usdPerOunce * usdIdr) / TROY_OUNCE_GRAMS;

export const parseYahooResponse = (json: any): GoldPoint[] => {
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const points: GoldPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    const d = new Date(timestamps[i] * 1000);
    points.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      usdPerOunce: close,
    });
  }
  return points;
};

const fetchYahoo = async (yahooRange: string): Promise<GoldPoint[]> => {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  let lastError: unknown = null;
  for (const host of hosts) {
    try {
      const res = await fetch(`https://${host}/v8/finance/chart/GC=F?range=${yahooRange}&interval=1d`, {
        headers: { 'User-Agent': UA },
      });
      if (!res.ok) throw new Error(`Yahoo ${res.status}`);
      const points = parseYahooResponse(await res.json());
      if (points.length === 0) throw new Error('Yahoo empty');
      return points;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gagal memuat harga emas');
};

const fetchUsdIdr = async (): Promise<number> => {
  const cached = await AsyncStorage.getItem('gold_usdidr').catch(() => null);
  if (cached != null) {
    try {
      const parsed = JSON.parse(cached) as { rate: number; at: number };
      if (Date.now() - parsed.at < CACHE_TTL_MS && parsed.rate > 0) return parsed.rate;
    } catch {
      // abaikan cache rusak
    }
  }
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR', {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Kurs ${res.status}`);
  const json = await res.json();
  const rate = Number(json?.rates?.IDR);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Kurs tidak valid');
  await AsyncStorage.setItem('gold_usdidr', JSON.stringify({ rate, at: Date.now() })).catch(() => {});
  return rate;
};

const readCache = async (range: GoldRange): Promise<GoldSeries | null> => {
  try {
    const raw = await AsyncStorage.getItem(`gold_series_${range}`);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as GoldSeries;
    if (!Array.isArray(parsed.points) || parsed.points.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};

const buildSeries = (points: GoldPoint[], usdIdr: number): GoldSeries => {
  const last = points[points.length - 1].usdPerOunce;
  const first = points[0].usdPerOunce;
  return {
    points,
    lastIdrPerGram: toIdrPerGram(last, usdIdr),
    changePct: first > 0 ? ((last - first) / first) * 100 : 0,
    usdIdr,
    fetchedAt: Date.now(),
  };
};

export const getGoldSeries = async (range: GoldRange): Promise<GoldSeries> => {
  const cached = await readCache(range);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;

  const entry = GOLD_RANGES.find((r) => r.key === range) ?? GOLD_RANGES[1];
  const [points, usdIdr] = await Promise.all([
    fetchYahoo(entry.yahooRange),
    fetchUsdIdr().catch(() => cached?.usdIdr ?? 16000),
  ]);
  const series = buildSeries(points, usdIdr);
  await AsyncStorage.setItem(`gold_series_${range}`, JSON.stringify(series)).catch(() => {});
  return series;
};

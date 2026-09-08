import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  link: string;
  /** epoch ms */
  publishedAt: number;
}

export type NewsKind = 'national' | 'international';

const FEEDS: Record<NewsKind, { url: string; cacheKey: string }> = {
  national: {
    url: 'https://news.google.com/rss/search?q=ekonomi%20Indonesia&hl=id&gl=ID&ceid=ID:id',
    cacheKey: 'econ_news_national',
  },
  international: {
    url: 'https://news.google.com/rss/search?q=global%20economy&hl=en-US&gl=US&ceid=US:en',
    cacheKey: 'econ_news_international',
  },
};
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_ITEMS = 10;
const UA = 'Mozilla/5.0 (Linux; Android 14) FinTrack/1.0';

const decodeEntities = (s: string): string =>
  s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

const tagContent = (block: string, tag: string): string => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
};

const hashLink = (link: string): string => {
  let h = 0;
  for (let i = 0; i < link.length; i++) {
    h = (h * 31 + link.charCodeAt(i)) | 0;
  }
  return `n${Math.abs(h).toString(36)}`;
};

export const parseNewsRss = (xml: string): NewsItem[] => {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const link = tagContent(block, 'link');
    if (!link) continue;
    const source = tagContent(block, 'source');
    let title = tagContent(block, 'title');
    // Judul Google News berakhiran " - NamaMedia"
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(3 + source.length)).trim();
    }
    if (!title) continue;
    const time = Date.parse(tagContent(block, 'pubDate'));
    items.push({
      id: hashLink(link),
      title,
      source: source || 'Berita',
      link,
      publishedAt: Number.isFinite(time) ? time : Date.now(),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
};

export const getEconNews = async (kind: NewsKind = 'national'): Promise<NewsItem[]> => {
  const feed = FEEDS[kind];
  try {
    const raw = await AsyncStorage.getItem(feed.cacheKey);
    if (raw != null) {
      const cached = JSON.parse(raw) as { items: NewsItem[]; at: number };
      if (Array.isArray(cached.items) && cached.items.length > 0 && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.items;
      }
    }
  } catch {
    // abaikan cache rusak
  }

  const res = await fetch(feed.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Berita ${res.status}`);
  const items = parseNewsRss(await res.text());
  if (items.length === 0) throw new Error('Berita kosong');
  await AsyncStorage.setItem(feed.cacheKey, JSON.stringify({ items, at: Date.now() })).catch(() => {});
  return items;
};

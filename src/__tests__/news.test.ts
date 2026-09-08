import { getEconNews, parseNewsRss } from '@/features/news/econNews';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAMPLE = `<?xml version="1.0"?>
<rss><channel>
<item><title>Ekonomi Tumbuh 6% - CNBC Indonesia</title><link>https://example.com/a</link><pubDate>Tue, 08 Sep 2026 08:18:32 GMT</pubDate><source url="https://x">CNBC Indonesia</source></item>
<item><title><![CDATA[Rupiah Menguat &amp; IHSG Naik]]></title><link>https://example.com/b</link><pubDate>Mon, 07 Sep 2026 10:00:00 GMT</pubDate><source url="https://y">Kontan</source></item>
<item><title>Tanpa tautan</title><pubDate>Mon, 07 Sep 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

describe('parseNewsRss', () => {
  it('memangkas akhiran media, decode entities, dan buang item tanpa link', () => {
    const items = parseNewsRss(SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Ekonomi Tumbuh 6%');
    expect(items[0].source).toBe('CNBC Indonesia');
    expect(items[0].publishedAt).toBe(Date.parse('Tue, 08 Sep 2026 08:18:32 GMT'));
    expect(items[1].title).toBe('Rupiah Menguat & IHSG Naik');
    expect(items[0].id).not.toBe(items[1].id);
  });

  it('kosong untuk XML tak valid', () => {
    expect(parseNewsRss('')).toEqual([]);
    expect(parseNewsRss('<rss></rss>')).toEqual([]);
  });
});

describe('getEconNews', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  const rss = (title: string) =>
    `<rss><channel><item><title>${title} - Reuters</title><link>https://example.com/${title.length}</link><pubDate>Tue, 08 Sep 2026 08:00:00 GMT</pubDate><source>Reuters</source></item></channel></rss>`;

  it('memakai feed & cache berbeda per jenis', async () => {
    const fetchMock = jest.fn(async (url: string) => ({
      ok: true,
      text: async () => rss(url.includes('gl=US') ? 'Global' : 'Nasional'),
    }));
    global.fetch = fetchMock as any;

    const [nasional, internasional] = await Promise.all([
      getEconNews('national'),
      getEconNews('international'),
    ]);

    expect(nasional[0].title).toBe('Nasional');
    expect(internasional[0].title).toBe('Global');
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('hl=id'))).toBe(true);
    expect(urls.some((u) => u.includes('hl=en-US'))).toBe(true);
    const keys = (AsyncStorage.setItem as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(keys).toContain('econ_news_national');
    expect(keys).toContain('econ_news_international');
  });
});

/**
 * Heuristik parser struk belanja Indonesia (Indomaret, Alfamart, SPBU, resto).
 * Pure function — tidak ada dependensi native, aman untuk unit test.
 */

export interface ParsedReceipt {
  amount: number | null;
  date: Date | null;
  merchantName: string | null;
  rawText: string;
}

// Baris yang mengandung kata kunci total — prioritas tertinggi untuk nominal.
const TOTAL_LINE_RE =
  /grand\s*total|total\s*(belanja|bayar|tagihan|pembayaran|akhir|keseluruhan)?|jumlah\s*(bayar|tagihan|total|pembayaran)?|^tagihan\b/i;

// Baris yang harus diabaikan saat cari nominal (kembalian, bukan belanja).
const CHANGE_LINE_RE = /kembali(an)?|susuk|change|kembalian/i;

// Token angka gaya Indonesia: "15.000", "1.250.000", "150 000", "15,000", "Rp 15.000,-"
const AMOUNT_TOKEN_RE =
  /(?:rp\.?\s*)?(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d{4,}(?:,\d{1,2})?)/gi;

const MONTHS_ID: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 3, may: 4, jun: 5, jul: 6,
  agu: 7, aug: 7, agust: 7, sep: 8, sept: 8, okt: 9, oct: 9,
  nov: 10, des: 11, dec: 11,
};

const NOISE_MERCHANT_RE =
  /^(no\.?|nomor|struk|nota|receipt|invoice|faktur|kasir|cashier|telp|phone|npwp|pkp|rt\b|\brw\b)/i;
const DATE_LIKE_RE =
  /\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}|\d{1,2}\s*:\s*\d{2}|(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)/i;
const PHONE_LIKE_RE = /^\s*(\+?62|0)\d{8,}\s*$/;

/**
 * Parse token angka Indonesia ke rupiah bulat.
 * Titik/spasi = pemisah ribu, koma = desimal (diabaikan, dibulatkan).
 */
export function parseIndonesianAmount(token: string): number | null {
  let s = token.toLowerCase().replace(/rp\.?/, '').replace(/[,.\-]\s*$/, '').trim();
  if (!s) return null;
  // Buang akhiran ",-" / ".-" khas struk ("15.000,-")
  s = s.replace(/[,.\-]\s*-$/, '').trim();
  if (!/\d/.test(s)) return null;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  const hasSpace = /\s/.test(s);

  let normalized: string;
  if ((hasDot || hasSpace) && hasComma) {
    // "1.250.000,00" -> 1250000
    normalized = s.replace(/[.\s]/g, '').replace(',', '.');
  } else if (hasComma) {
    // "15,00" (desimal) vs "15,000" (ribuan gaya EN)
    if (/\d,\d{2}$/.test(s)) normalized = s.replace(/\./g, '').replace(',', '.');
    else normalized = s.replace(/,/g, '');
  } else {
    // "15.000" / "150 000" -> pemisah ribu
    normalized = s.replace(/[.\s]/g, '');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function extractAmountTokens(line: string): number[] {
  const out: number[] = [];
  AMOUNT_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_TOKEN_RE.exec(line)) !== null) {
    const v = parseIndonesianAmount(m[1] ?? m[0]);
    if (v !== null) out.push(v);
  }
  return out;
}

function isSkippableAmountLine(line: string): boolean {
  if (CHANGE_LINE_RE.test(line)) return true;
  if (PHONE_LIKE_RE.test(line)) return true;
  if (/telp|phone|npwp|rekening|account/i.test(line)) return true;
  return false;
}

function extractAmount(lines: string[]): number | null {
  // 1. Prioritas: baris TOTAL / GRAND TOTAL / TAGIHAN / JUMLAH
  let best: number | null = null;
  for (const line of lines) {
    if (!TOTAL_LINE_RE.test(line) || isSkippableAmountLine(line)) continue;
    const tokens = extractAmountTokens(line);
    for (const v of tokens) best = best === null ? v : Math.max(best, v);
  }
  if (best !== null) return best;

  // 2. Fallback: nominal terbesar di seluruh struk (abaikan kembalian & no. telepon).
  let fallback: number | null = null;
  for (const line of lines) {
    if (isSkippableAmountLine(line) || DATE_LIKE_RE.test(line)) continue;
    for (const v of extractAmountTokens(line)) {
      if (v < 500) continue; // hindari nomor urut / jam
      fallback = fallback === null ? v : Math.max(fallback, v);
    }
  }
  return fallback;
}

function toValidDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function expandYear(yy: number): number {
  if (yy >= 100) return yy;
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

function extractDate(lines: string[]): Date | null {
  for (const line of lines) {
    // YYYY-MM-DD / YYYY/MM/DD — dicek dulu agar varian DD tidak menelan
    // ekor tahun ("25-08-20" di dalam "2025-08-20").
    let m = line.match(/(^|[^\d])(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?![\d])/);
    if (m) {
      const dt = toValidDate(Number(m[2]), Number(m[3]), Number(m[4]));
      if (dt) return dt;
    }
    // DD MMM YYYY ("12 Agu 2025", "05 Januari 2024")
    m = line.match(/(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/i);
    if (m) {
      const key = m[2].slice(0, 4).toLowerCase();
      const month = MONTHS_ID[key] ?? MONTHS_ID[m[2].slice(0, 3).toLowerCase()];
      if (month !== undefined) {
        const dt = toValidDate(expandYear(Number(m[3])), month + 1, Number(m[1]));
        if (dt) return dt;
      }
    }
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (+ jam opsional).
    // Prefix (^|[^\d]) mencegah match di dalam nomor SPBU ("34-12345")
    // atau tahun 4 digit.
    m = line.match(/(^|[^\d])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?![\d])/);
    if (m) {
      const dt = toValidDate(expandYear(Number(m[4])), Number(m[3]), Number(m[2]));
      if (dt) return dt;
    }
  }
  return null;
}

function extractMerchant(lines: string[]): string | null {
  const candidates = lines.slice(0, 6).filter((line) => {
    const t = line.trim();
    if (t.length < 3 || t.length > 50) return false;
    if (!/[a-zA-Z]{2,}/.test(t)) return false;
    if (NOISE_MERCHANT_RE.test(t)) return false;
    if (PHONE_LIKE_RE.test(t)) return false;
    // Baris yang murni tanggal/waktu bukan nama merchant.
    const stripped = t.replace(DATE_LIKE_RE, '').replace(/[\d\s/:.\-]+/g, '').trim();
    if (stripped.length < 2) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  const first = candidates[0].trim();
  const second = candidates[1]?.trim();
  // Gabung baris cabang ("INDOMARET" + "Cabang Tebet") agar judul lebih bermakna.
  if (second && second.length <= 40 && /cabang|store|toko|jl\.|jalan|mall|point|no\.|\d/.test(second.toLowerCase())) {
    return `${first} - ${second}`.slice(0, 60);
  }
  return first.slice(0, 60);
}

/**
 * Parse teks OCR mentah struk menjadi field transaksi.
 * Tidak pernah throw untuk teks kosong — kembalikan null per field.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { amount: null, date: null, merchantName: null, rawText };

  return {
    amount: extractAmount(lines),
    date: extractDate(lines),
    merchantName: extractMerchant(lines),
    rawText,
  };
}

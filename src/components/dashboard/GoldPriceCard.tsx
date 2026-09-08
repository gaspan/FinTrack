import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { MarketAreaChart } from '@/components/charts/MarketAreaChart';
import { formatRupiah, formatRupiahShort } from '@/utils/format';
import { GOLD_RANGES, getGoldSeries, toIdrPerGram, type GoldRange, type GoldSeries } from '@/features/gold/goldPrice';

const GOLD = '#EAB308';
const CHART_H = 150;

export const GoldPriceCard: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenW } = useWindowDimensions();
  const chartW = Math.max(200, screenW - theme.spacing.md * 4);

  const [range, setRange] = useState<GoldRange>('3M');
  const [series, setSeries] = useState<GoldSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getGoldSeries(range)
      .then((s) => {
        if (!cancelled) {
          setSeries(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range, retry]);

  const values = useMemo(
    () => series?.points.map((p) => toIdrPerGram(p.usdPerOunce, series.usdIdr)) ?? [],
    [series]
  );
  const up = (series?.changePct ?? 0) >= 0;
  const changeColor = up ? theme.colors.income : theme.colors.expense;

  return (
    <>
      <SegmentTabs
        options={GOLD_RANGES.map((r) => ({ key: r.key, label: r.label }))}
        value={range}
        onChange={(k) => {
          setLoading(true);
          setFailed(false);
          setRange(k as GoldRange);
        }}
        labelPrefix="Rentang"
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <Skeleton height={26} width="55%" style={{ marginBottom: 6 }} />
          <Skeleton height={12} width="35%" style={{ marginBottom: 12 }} />
          <Skeleton height={CHART_H} style={{ borderRadius: theme.radius.md }} />
        </View>
      ) : failed || !series || values.length < 2 ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={30} color={theme.colors.textMuted} />
          <Text style={styles.errorTitle}>Harga emas tak tersedia</Text>
          <Text style={styles.errorText}>Periksa koneksi internet lalu coba lagi.</Text>
          <Button
            title="Coba lagi"
            onPress={() => {
              setLoading(true);
              setFailed(false);
              setRetry((n) => n + 1);
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.priceRow}>
            <View style={styles.priceWrap}>
              <Text style={styles.priceLabel}>Per gram (Rp)</Text>
              <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
                {formatRupiah(Math.round(series.lastIdrPerGram))}
              </Text>
            </View>
            <View style={[styles.changePill, { backgroundColor: `${changeColor}1F` }]}>
              <Ionicons name={up ? 'trending-up' : 'trending-down'} size={13} color={changeColor} />
              <Text style={[styles.changeText, { color: changeColor }]}>
                {up ? '+' : ''}{series.changePct.toFixed(1)}%
              </Text>
            </View>
          </View>

          <MarketAreaChart
            values={values}
            dates={series.points.map((p) => p.date)}
            width={chartW}
            height={CHART_H}
            color={GOLD}
            gradientId="goldFill"
            formatValue={(v) => formatRupiahShort(Math.round(v))}
          />

          <Text style={styles.source}>Sumber: Yahoo Finance (emas GC=F) • Kurs USD/IDR: Frankfurter</Text>
        </>
      )}
    </>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  loadingWrap: { paddingVertical: theme.spacing.xs },
  errorWrap: { alignItems: 'center', gap: 6, paddingVertical: theme.spacing.lg },
  errorTitle: { ...theme.typography.body, fontWeight: '700', color: theme.colors.textPrimary },
  errorText: { ...theme.typography.bodySmall, marginBottom: theme.spacing.sm },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  priceWrap: { flex: 1 },
  priceLabel: { ...theme.typography.caption },
  price: { ...theme.typography.h2, fontSize: 22, color: theme.colors.textPrimary, marginTop: 2 },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.round,
  },
  changeText: { ...theme.typography.bodySmall, fontWeight: '700' },
  source: { ...theme.typography.caption, fontSize: 9, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRupiahShort } from '@/utils/format';
import { getGoldSeries, type GoldSeries } from '@/features/gold/goldPrice';
import { getUsdIdrSeries, type FxSeries } from '@/features/fx/usdIdr';
import { hapticLight } from '@/utils/haptic';

const GOLD = '#EAB308';

/**
 * Ticker ringkas: harga emas + kurs USD/IDR dalam satu baris horizontal.
 * Tap untuk membuka layar detail dengan chart lengkap.
 */
export const MarketWatchCard: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [gold, setGold] = useState<GoldSeries | null>(null);
  const [fx, setFx] = useState<FxSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getGoldSeries('1M'), getUsdIdrSeries('1M')])
      .then(([g, f]) => {
        if (cancelled) return;
        if (g.status === 'fulfilled') setGold(g.value);
        if (f.status === 'fulfilled') setFx(f.value);
        if (g.status === 'rejected' && f.status === 'rejected') setFailed(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card style={styles.card}>
        <Skeleton height={52} style={{ borderRadius: theme.radius.md }} />
      </Card>
    );
  }

  if (failed || (!gold && !fx)) return null;

  const renderTile = (
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    label: string,
    value: string,
    changePct: number | null
  ) => {
    const up = (changePct ?? 0) >= 0;
    const changeColor = up ? theme.colors.income : theme.colors.expense;
    return (
      <View style={styles.tile}>
        <View style={[styles.tileIcon, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <View style={styles.tileCopy}>
          <Text style={styles.tileLabel}>{label}</Text>
          <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        </View>
        {changePct != null && (
          <View style={[styles.changePill, { backgroundColor: `${changeColor}1F` }]}>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={11} color={changeColor} />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {up ? '+' : ''}{changePct.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Buka detail harga emas dan kurs"
        onPress={() => {
          hapticLight();
          router.push('/market' as any);
        }}
      >
        {gold
          ? renderTile(
              'diamond-outline',
              GOLD,
              'Emas / gram',
              formatRupiahShort(Math.round(gold.lastIdrPerGram)),
              gold.changePct
            )
          : renderTile('diamond-outline', GOLD, 'Emas / gram', '—', null)}
        <View style={styles.divider} />
        {fx
          ? renderTile(
              'cash-outline',
              theme.colors.info,
              'USD → IDR',
              formatRupiahShort(Math.round(fx.last)),
              fx.changePct
            )
          : renderTile('cash-outline', theme.colors.info, 'USD → IDR', '—', null)}
        <Ionicons name="chevron-forward" size={15} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Card>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
    paddingVertical: theme.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCopy: { flex: 1 },
  tileLabel: { ...theme.typography.caption, fontSize: 9 },
  tileValue: { ...theme.typography.bodySmall, fontWeight: '800', color: theme.colors.textPrimary },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: theme.radius.round,
  },
  changeText: { ...theme.typography.caption, fontSize: 9, fontWeight: '800' },
  divider: { width: 1, height: 28, backgroundColor: theme.colors.border },
});

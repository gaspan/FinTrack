import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, type GestureResponderEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useTheme, type Theme } from '@/constants/theme';

dayjs.locale('id');

const TOOLTIP_W = 136;

interface MarketAreaChartProps {
  /** nilai garis */
  values: number[];
  /** tanggal YYYY-MM-DD sejajar values */
  dates: string[];
  width: number;
  height: number;
  color: string;
  /** id unik gradient (wajib beda tiap chart) */
  gradientId: string;
  formatValue: (v: number) => string;
}

export const MarketAreaChart: React.FC<MarketAreaChartProps> = ({
  values,
  dates,
  width,
  height,
  color,
  gradientId,
  formatValue,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(null);

  const geom = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = 8;
    const stepX = (width - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => ({
      x: pad + i * stepX,
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
    const line = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    return {
      line,
      area: `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`,
      last: pts[pts.length - 1],
      pts,
      stepX,
      pad,
      min,
      max,
    };
  }, [values, width, height]);

  if (!geom) return null;

  const pick = (e: GestureResponderEvent) => {
    const idx = Math.max(0, Math.min(geom.pts.length - 1, Math.round((e.nativeEvent.locationX - geom.pad) / geom.stepX)));
    if (selectedRef.current !== idx) {
      selectedRef.current = idx;
      setSelected(idx);
    }
  };
  const clear = () => {
    selectedRef.current = null;
    setSelected(null);
  };

  const sel = selected != null ? geom.pts[selected] : null;
  const tipLeft = sel ? Math.max(4, Math.min(width - TOOLTIP_W - 4, sel.x - TOOLTIP_W / 2)) : 0;
  const tipTop = sel ? (sel.y > 100 ? sel.y - 84 : sel.y + 14) : 0;

  return (
    <View>
      <View
        onTouchStart={pick}
        onTouchMove={pick}
        onTouchEnd={clear}
        onTouchCancel={clear}
        accessibilityRole="adjustable"
        accessibilityLabel="Grafik harga, sentuh dan geser untuk melihat nilai"
      >
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.35" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={geom.area} fill={`url(#${gradientId})`} />
          <Path d={geom.line} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {sel && (
            <>
              <Line
                x1={sel.x}
                y1={4}
                x2={sel.x}
                y2={height - 4}
                stroke={theme.colors.textMuted}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <Line
                x1={4}
                y1={sel.y}
                x2={width - 4}
                y2={sel.y}
                stroke={theme.colors.textMuted}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <Circle cx={sel.x} cy={sel.y} r={5} fill={color} stroke={theme.colors.surface} strokeWidth={2} />
            </>
          )}
          {selected == null && (
            <Circle cx={geom.last.x} cy={geom.last.y} r={4} fill={color} stroke={theme.colors.surface} strokeWidth={2} />
          )}
        </Svg>

        {sel && selected != null && (
          <View style={[styles.tooltip, { left: tipLeft, top: tipTop }]} pointerEvents="none">
            <Text style={styles.tooltipDate}>{dayjs(dates[selected]).format('DD MMM YYYY')}</Text>
            <Text style={styles.tooltipValue} numberOfLines={1}>
              {formatValue(values[selected])}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{dayjs(dates[0]).format('MMM YY')}</Text>
        <Text style={styles.axisText}>{dayjs(dates[Math.floor(dates.length / 2)]).format('MMM YY')}</Text>
        <Text style={styles.axisText}>{dayjs(dates[dates.length - 1]).format('MMM YY')}</Text>
      </View>

      <View style={styles.minMaxRow}>
        <Text style={styles.minMaxText}>Terendah {formatValue(geom.min)}</Text>
        <Text style={styles.minMaxText}>Tertinggi {formatValue(geom.max)}</Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_W,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  tooltipDate: { ...theme.typography.caption, fontSize: 10 },
  tooltipValue: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 2 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { ...theme.typography.caption, fontSize: 10 },
  minMaxRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  minMaxText: { ...theme.typography.caption, fontSize: 10, color: theme.colors.textSecondary },
});

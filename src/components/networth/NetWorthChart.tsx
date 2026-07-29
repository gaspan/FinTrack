import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { LineChart } from 'react-native-gifted-charts';
import { NetWorthSnapshot } from '@/types';

interface NetWorthChartProps {
  data: NetWorthSnapshot[];
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (data.length === 0) {
    return <Text style={styles.empty}>Data belum tersedia</Text>;
  }

  const sorted = [...data].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const chartData = sorted.map((d) => ({
    value: d.net_worth,
    label: d.snapshot_date.slice(5, 7) + '/' + d.snapshot_date.slice(2, 4),
    dataPointText: d.net_worth >= 1000000
      ? `${(d.net_worth / 1000000).toFixed(1)}jt`
      : `${(d.net_worth / 1000).toFixed(0)}rb`,
  }));

  const allPositive = chartData.every(d => d.value >= 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tren Kekayaan Bersih</Text>
      <LineChart
        data={chartData}
        color={allPositive ? '#10B981' : '#6366F1'}
        thickness={2}
        startFillColor={allPositive ? '#10B981' : '#6366F1'}
        endFillColor={allPositive ? '#10B981' : '#6366F1'}
        startOpacity={0.15}
        endOpacity={0.03}
        dataPointsColor={allPositive ? '#10B981' : '#6366F1'}
        dataPointsRadius={3}
        textFontSize={10}
        textColor={theme.colors.textSecondary}
        xAxisColor={theme.colors.border}
        yAxisColor={theme.colors.border}
        yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 9 }}
        height={180}
        spacing={Math.max(30, Math.min(80, 500 / chartData.length))}
        scrollToEnd
        isAnimated
        showScrollIndicator={false}
      />
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  title: { ...theme.typography.subtitle, marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 40 },
});
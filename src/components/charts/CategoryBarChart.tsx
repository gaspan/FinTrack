import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme, type Theme } from '@/constants/theme';
import { ChartDataPoint } from '@/types';
import { EmptyState } from '../ui/EmptyState';

interface CategoryBarChartProps {
  data: ChartDataPoint[];
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState 
          title="Tidak ada data" 
          message="Belum ada transaksi di rentang waktu ini." 
          icon="bar-chart-outline" 
        />
      </View>
    );
  }

  // Find max value to scale chart appropriately
  const maxValue = Math.max(...data.map(d => d.value)) * 1.2 || 1000;

  const formatYLabel = (val: string) => {
    const num = parseInt(val, 10);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}Jt`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}rb`;
    return val;
  };

  const chartData = data.map(item => ({
    value: item.value,
    label: item.label,
    frontColor: item.color || theme.colors.primary,
    topLabelComponent: () => (
      <Text style={styles.topLabel}>
        {formatYLabel(item.value.toString())}
      </Text>
    ),
  }));

  return (
    <View style={styles.container}>
      <BarChart
        data={chartData}
        barWidth={32}
        spacing={24}
        roundedTop
        roundedBottom
        xAxisThickness={1}
        xAxisColor={theme.colors.border}
        yAxisThickness={0}
        yAxisTextStyle={styles.yAxisLabel}
        xAxisLabelTextStyle={styles.xAxisLabel}
        noOfSections={4}
        maxValue={maxValue}
        formatYLabel={formatYLabel}
        showValuesAsTopLabel
        isAnimated
        animationDuration={500}
        height={220}
        rulesColor={theme.colors.border}
        rulesType="dashed"
        labelWidth={50}
        labelsExtraHeight={20}
      />
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  emptyContainer: {
    height: 250,
    justifyContent: 'center',
  },
  yAxisLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  xAxisLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
  topLabel: {
    color: theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  }
});

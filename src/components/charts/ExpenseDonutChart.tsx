import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { theme } from '@/constants/theme';
import { ChartDataPoint } from '@/types';
import { EmptyState } from '../ui/EmptyState';
import { formatRupiahShort } from '@/utils/format';

interface ExpenseDonutChartProps {
  data: ChartDataPoint[];
  type: 'income' | 'expense';
  total: number;
}

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({ data, type, total }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState 
          title="Tidak ada data" 
          message="Belum ada transaksi di rentang waktu ini." 
          icon="pie-chart-outline" 
        />
      </View>
    );
  }


  // Process data for PieChart
  const pieData = data.map(item => {
    const percentage = ((item.value / total) * 100).toFixed(0);
    return {
      value: item.value,
      color: item.color || theme.colors.primary,
      text: `${percentage}%`,
      textColor: '#FFF',
      textSize: 12,
    };
  });

  return (
    <View style={styles.container}>
      <PieChart
        donut
        data={pieData}
        radius={110}
        innerRadius={70}
        innerCircleColor={theme.colors.surface}
        showText
        textColor="#FFF"
        textSize={12}
        showTextBackground
        textBackgroundRadius={14}
        textBackgroundColor="rgba(0,0,0,0.5)"
        focusOnPress
        animationDuration={500}
        centerLabelComponent={() => (
          <View style={styles.centerContainer}>
            <Text style={styles.centerLabel}>Total</Text>
            <Text style={[
              styles.centerValue, 
              { color: type === 'income' ? theme.colors.income : theme.colors.expense }
            ]}>
              {formatRupiahShort(total)}
            </Text>
          </View>
        )}
      />
      
      {/* Legend */}
      <View style={styles.legendContainer}>
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(0);
          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color || theme.colors.primary }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.legendValue}>{percentage}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyContainer: {
    height: 250,
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  centerValue: {
    ...theme.typography.h3,
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%', // Two columns
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  legendValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  }
});

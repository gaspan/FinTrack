import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ChartToggle } from '@/components/charts/ChartToggle';
import { OverviewDonutChart } from '@/components/charts/OverviewDonutChart';
import { ExpenseDonutChart } from '@/components/charts/ExpenseDonutChart';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';

type Tab = 'ringkas' | 'kategori' | 'tren';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ringkas', label: 'Ringkas' },
  { key: 'kategori', label: 'Kategori' },
  { key: 'tren', label: 'Tren' },
];

interface AnalyticsCardProps {
  income: number;
  expense: number;
  chartData: { value: number; label: string; color: string }[];
  chartType: 'income' | 'expense';
  onChartTypeChange: (v: 'income' | 'expense') => void;
  chartTotal: number;
  trendData: { month: string; income: number; expense: number }[];
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  income,
  expense,
  chartData,
  chartType,
  onChartTypeChange,
  chartTotal,
  trendData,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [tab, setTab] = useState<Tab>('ringkas');

  return (
    <Card>
      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'ringkas' && (
        <OverviewDonutChart income={income} expense={expense} />
      )}

      {tab === 'kategori' && (
        <>
          <ChartToggle
            options={[
              { label: 'Pemasukan', value: 'income' },
              { label: 'Pengeluaran', value: 'expense' },
            ]}
            value={chartType}
            onChange={(val: string) => onChartTypeChange(val as 'income' | 'expense')}
          />
          <ExpenseDonutChart data={chartData} type={chartType} total={chartTotal} />
          <View style={styles.divider} />
          <Text style={styles.subTitle}>Komparasi Nominal</Text>
          <CategoryBarChart data={chartData} />
        </>
      )}

      {tab === 'tren' && <MonthlyTrendChart data={trendData} />}
    </Card>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.round,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.round,
  },
  segmentItemActive: { backgroundColor: theme.colors.primary },
  segmentText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: { color: theme.colors.textOnPrimary },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  subTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
});

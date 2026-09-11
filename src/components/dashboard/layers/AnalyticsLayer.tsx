import React from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { MonthBarsCard } from '@/components/dashboard/MonthBarsCard';
import { AnalyticsCard } from '@/components/dashboard/AnalyticsCard';
import type { DashboardData } from '@/features/dashboard/useDashboardData';

interface AnalyticsLayerProps {
  data: DashboardData;
}

/** LAYER 3 — Analitik visual: bar bulanan + breakdown kategori. */
export const AnalyticsLayer: React.FC<AnalyticsLayerProps> = ({ data }) => (
  <>
    {(data.monthExpense.length > 0 || data.monthIncome.length > 0) && (
      <AnimatedSection index={0}>
        <View>
          <SectionHeader title={`Bulan Ini · ${dayjs().format('MMMM')}`} icon="bar-chart-outline" />
          <MonthBarsCard expense={data.monthExpense} income={data.monthIncome} />
        </View>
      </AnimatedSection>
    )}

    <AnimatedSection index={1}>
      <View>
        <SectionHeader title="Analisis finansial" icon="analytics-outline" />
        <AnalyticsCard
          income={data.summary.totalIncome}
          expense={data.summary.totalExpense}
          chartData={data.chartData}
          chartType={data.chartType}
          onChartTypeChange={data.setChartType}
          chartTotal={data.chartTotal}
          trendData={data.trendData}
        />
      </View>
    </AnimatedSection>
  </>
);

import React from 'react';

import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { SmartInsightCard } from '@/components/dashboard/SmartInsightCard';
import { UpcomingBillsCard } from '@/components/dashboard/UpcomingBillsCard';
import type { DashboardData } from '@/features/dashboard/useDashboardData';

interface AlertsLayerProps {
  data: DashboardData;
}

/** LAYER 2 — Kesadaran & peringatan: wawasan terpadu + tagihan mendatang. */
export const AlertsLayer: React.FC<AlertsLayerProps> = ({ data }) => (
  <>
    <AnimatedSection index={0}>
      <SmartInsightCard
        health={data.insightData.financialHealth}
        tips={data.insightData.financialTips}
        comparisons={data.insightData.comparisons}
        alerts={data.insightData.alerts}
      />
    </AnimatedSection>
    <AnimatedSection index={1}>
      <UpcomingBillsCard items={data.upcoming} />
    </AnimatedSection>
  </>
);

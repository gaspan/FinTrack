import React from 'react';

import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { GoalsStrip } from '@/components/dashboard/GoalsStrip';
import { NetWorthSummaryCard } from '@/components/networth/NetWorthSummaryCard';
import type { DashboardData } from '@/features/dashboard/useDashboardData';

interface WealthLayerProps {
  data: DashboardData;
}

/** LAYER 4 — Kekayaan jangka panjang: target menabung + kekayaan bersih. */
export const WealthLayer: React.FC<WealthLayerProps> = ({ data }) => (
  <>
    <AnimatedSection index={0}>
      <GoalsStrip goals={data.goals} />
    </AnimatedSection>
    {data.netWorthData && (
      <AnimatedSection index={1}>
        <NetWorthSummaryCard
          totalAssets={data.netWorthData.totalAssets}
          totalLiabilities={data.netWorthData.totalLiabilities}
          netWorth={data.netWorthData.netWorth}
          history={data.netWorthHistory}
        />
      </AnimatedSection>
    )}
  </>
);

import React from 'react';

import { AnimatedSection } from '@/components/dashboard/AnimatedSection';
import { MarketWatchCard } from '@/components/dashboard/MarketWatchCard';
import { NewsSection } from '@/components/dashboard/NewsSection';

/** LAYER 5 — Makro & pasar: ticker emas/kurs + berita (default tertutup). */
export const MarketLayer: React.FC = () => (
  <>
    <AnimatedSection index={0}>
      <MarketWatchCard />
    </AnimatedSection>
    <AnimatedSection index={1}>
      <NewsSection />
    </AnimatedSection>
  </>
);

import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { shouldReduceMotion, staggerDelay } from '@/utils/motion';

interface AnimatedSectionProps {
  index?: number;
  step?: number;
  children: React.ReactNode;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({ index = 0, step = 45, children }) => {
  if (shouldReduceMotion()) return <>{children}</>;
  return (
    <Animated.View
      entering={FadeInDown.duration(380).delay(staggerDelay(index, step)).springify().damping(20).stiffness(160)}
    >
      {children}
    </Animated.View>
  );
};

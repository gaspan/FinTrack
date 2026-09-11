import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useTheme, type Theme } from '@/constants/theme';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EconNewsCarousel } from '@/components/dashboard/EconNewsCarousel';
import { hapticLight } from '@/utils/haptic';
import type { NewsKind } from '@/features/news/econNews';

const KINDS: { key: NewsKind; label: string }[] = [
  { key: 'national', label: 'Nasional' },
  { key: 'international', label: 'Internasional' },
];

/**
 * Satu accordion berita ekonomi dengan toggle Nasional/Internasional.
 * Default tertutup agar dashboard tidak penuh oleh konten eksternal.
 */
export const NewsSection: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [kind, setKind] = useState<NewsKind>('national');

  return (
    <CollapsibleSection
      title="Berita Ekonomi"
      subtitle="Update ekonomi terkini"
      icon="newspaper-outline"
      iconColor={theme.colors.accent}
      defaultExpanded={false}
    >
      <View style={styles.toggle}>
        {KINDS.map(k => (
          <TouchableOpacity
            key={k.key}
            style={[styles.toggleTab, kind === k.key && styles.toggleTabActive]}
            activeOpacity={0.8}
            onPress={() => {
              if (kind === k.key) return;
              hapticLight();
              setKind(k.key);
            }}
          >
            <Text style={[styles.toggleText, kind === k.key && styles.toggleTextActive]}>
              {k.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <EconNewsCarousel kind={kind} />
    </CollapsibleSection>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  toggleTabActive: { backgroundColor: theme.colors.surfaceElevated },
  toggleText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: theme.colors.textPrimary, fontWeight: '700' },
});

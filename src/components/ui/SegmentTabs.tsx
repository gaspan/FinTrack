import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';
import { hapticLight } from '@/utils/haptic';

interface SegmentTabsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  labelPrefix?: string;
}

export const SegmentTabs: React.FC<SegmentTabsProps> = ({ options, value, onChange, labelPrefix }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.item, active && styles.itemActive]}
            activeOpacity={0.8}
            onPress={() => {
              if (o.key !== value) {
                hapticLight();
                onChange(o.key);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={labelPrefix ? `${labelPrefix} ${o.label}` : o.label}
          >
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
  item: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.round,
  },
  itemActive: { backgroundColor: theme.colors.primary },
  text: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  textActive: { color: theme.colors.textOnPrimary },
});

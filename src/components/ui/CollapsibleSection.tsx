import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { hapticLight } from '@/utils/haptic';
import { shouldReduceMotion } from '@/utils/motion';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  defaultExpanded = true,
  children,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const reduceMotion = shouldReduceMotion();
  const tint = iconColor ?? theme.colors.primary;

  return (
    <Animated.View layout={reduceMotion ? undefined : LinearTransition.springify().damping(24).stiffness(200)}>
      <Card style={styles.box}>
        <TouchableOpacity
          style={styles.header}
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            setExpanded((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${expanded ? 'tutup' : 'buka'}`}
          accessibilityState={{ expanded }}
        >
          <View style={styles.titleWrap}>
            {icon != null && (
              <View style={[styles.iconBadge, { backgroundColor: `${tint}1F` }]}>
                <Ionicons name={icon} size={15} color={tint} />
              </View>
            )}
            <View style={styles.titleCol}>
              <Text style={styles.title}>{title}</Text>
              {subtitle != null && (
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
              )}
            </View>
          </View>
          <View style={styles.chevronBadge}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {expanded && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(280).springify().damping(22)}
            exiting={reduceMotion ? undefined : FadeOut.duration(150)}
          >
            {children}
          </Animated.View>
        )}
      </Card>
    </Animated.View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  box: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: { flex: 1 },
  title: {
    ...theme.typography.h3,
    fontSize: 16,
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: 1,
  },
  chevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

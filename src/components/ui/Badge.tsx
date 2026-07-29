import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';

interface BadgeProps {
  label: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  color,
  icon,
  style 
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const badgeColor = color ?? theme.colors.primary;
  return (
    <View style={[styles.container, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}40` }, style]}>
      {icon && (
        <Ionicons name={icon} size={12} color={badgeColor} style={styles.icon} />
      )}
      <Text style={[styles.label, { color: badgeColor }]}>{label}</Text>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '600',
  }
});

import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';

interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({ 
  label, 
  icon, 
  selected = false, 
  onPress, 
  style 
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.container,
        selected && styles.selectedContainer,
        style
      ]}
    >
      {icon && (
        <Ionicons 
          name={icon} 
          size={16} 
          color={selected ? '#FFF' : theme.colors.textSecondary} 
          style={styles.icon} 
        />
      )}
      <Text style={[
        styles.label,
        selected && styles.selectedLabel
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  selectedContainer: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectedLabel: {
    color: '#FFF',
    fontWeight: '600',
  }
});

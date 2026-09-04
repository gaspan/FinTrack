import React, { useMemo } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, elevated, ...props }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View 
      style={[
        styles.card, 
        elevated && styles.elevated,
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  elevated: {
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.shadow.md,
  }
});

import React, { useMemo } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type Theme } from '@/constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  glass?: boolean;
  glow?: boolean;
  gradient?: readonly [string, string];
}

export const Card: React.FC<CardProps> = ({ children, style, elevated, glass, glow, gradient, ...props }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          styles.gradientCard,
          glow && styles.glow,
          style,
        ]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        glass && styles.glass,
        glow && styles.glow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  elevated: {
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.shadow.md,
  },
  glass: {
    backgroundColor: theme.colors.surfaceGlass,
    borderColor: theme.colors.glassBorder,
  },
  gradientCard: {
    borderWidth: 0,
  },
  glow: {
    ...theme.shadow.glow,
  },
});

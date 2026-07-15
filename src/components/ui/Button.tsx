import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  variant = 'primary', 
  loading = false, 
  fullWidth = false,
  style,
  disabled,
  ...props 
}) => {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFF' : theme.colors.primary} />
      ) : (
        <Text style={[
          styles.text, 
          isPrimary && styles.textPrimary,
          variant === 'danger' && styles.textDanger,
          variant === 'ghost' && styles.textGhost,
          isDisabled && !isPrimary && { color: theme.colors.textSecondary }
        ]}>
          {title}
        </Text>
      )}
    </View>
  );

  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    variant === 'danger' && styles.danger,
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style
  ];

  if (isPrimary && !isDisabled) {
    return (
      <TouchableOpacity activeOpacity={0.8} disabled={isDisabled} {...props} style={fullWidth ? { width: '100%' } : undefined}>
        <LinearGradient
          colors={theme.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, fullWidth && styles.fullWidth, style]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      disabled={isDisabled} 
      style={buttonStyle}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  },
  text: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  textPrimary: {
    color: '#FFF',
  },
  textDanger: {
    color: theme.colors.danger,
  },
  textGhost: {
    color: theme.colors.textSecondary,
  }
});

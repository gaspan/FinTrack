import React, { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const { theme } = useTheme();
  const focusAnim = useSharedValue(0);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: focusAnim.value === 1
      ? theme.colors.primary
      : error ? theme.colors.danger : theme.colors.border,
    shadowColor: theme.colors.primary,
    shadowOpacity: focusAnim.value * 0.2,
    shadowRadius: focusAnim.value * 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: focusAnim.value * 4,
  }));

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
      color: theme.colors.textSecondary,
    },
    inputContainer: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    input: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
      paddingHorizontal: theme.spacing.md,
      height: 50,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
      marginTop: theme.spacing.xs,
    },
  }), [theme]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputContainer, animatedBorder]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            focusAnim.value = withTiming(1, { duration: 200 });
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            focusAnim.value = withTiming(0, { duration: 200 });
            props.onBlur?.(e);
          }}
          {...props}
        />
      </Animated.View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
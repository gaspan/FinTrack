import React, { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      ...theme.typography.bodySmall,
      marginBottom: theme.spacing.xs,
    },
    input: {
      ...theme.typography.body,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      height: 48,
    },
    inputError: {
      borderColor: theme.colors.danger,
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
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
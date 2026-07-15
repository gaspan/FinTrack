import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '@/constants/theme';

interface NumericInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  label?: string;
  error?: string;
  value: number;
  onChangeValue: (val: number) => void;
}

import { formatRupiahNumberOnly } from '@/utils/format';

export const NumericInput: React.FC<NumericInputProps> = ({ 
  label, 
  error, 
  value, 
  onChangeValue, 
  style, 
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const displayValue = value === 0 ? '' : formatRupiahNumberOnly(value);

  const handleChangeText = (text: string) => {
    // Remove non-numeric characters
    const numericStr = text.replace(/[^0-9]/g, '');
    const num = parseInt(numericStr, 10);
    onChangeValue(isNaN(num) ? 0 : num);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        error && styles.inputError,
        isFocused && styles.inputFocused,
        style
      ]}>
        <Text style={styles.prefix}>Rp</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 64, // Taller for numeric input
  },
  inputFocused: {
    borderColor: theme.colors.primary,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  prefix: {
    ...theme.typography.h2,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    ...theme.typography.h2,
    paddingVertical: 0,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  }
});

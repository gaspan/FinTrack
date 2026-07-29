import React, { useState, useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/constants/theme';
import { formatRupiahNumberOnly } from '@/utils/format';

interface NumericInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  label?: string;
  error?: string;
  value: number;
  onChangeValue: (val: number) => void;
}

export const NumericInput: React.FC<NumericInputProps> = ({ 
  label, 
  error, 
  value, 
  onChangeValue, 
  style, 
  ...props 
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const displayValue = value === 0 ? '' : formatRupiahNumberOnly(value);

  const handleChangeText = (text: string) => {
    const numericStr = text.replace(/[^0-9]/g, '');
    const num = parseInt(numericStr, 10);
    onChangeValue(isNaN(num) ? 0 : num);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 12,
      fontWeight: '400',
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
      height: 64,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    prefix: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    errorText: {
      fontSize: 10,
      fontWeight: '400',
      color: theme.colors.danger,
      marginTop: theme.spacing.xs,
    },
  }), [theme]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        error && styles.inputError,
        isFocused && styles.inputFocused,
        style as any,
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
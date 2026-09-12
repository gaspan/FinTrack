import React, { useState, useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  const focusAnim = useSharedValue(0);
  
  const displayValue = value === 0 ? '' : formatRupiahNumberOnly(value);

  const handleChangeText = (text: string) => {
    const numericStr = text.replace(/[^0-9]/g, '');
    const num = parseInt(numericStr, 10);
    onChangeValue(isNaN(num) ? 0 : num);
  };

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: focusAnim.value === 1
      ? theme.colors.primary
      : error ? theme.colors.danger : theme.colors.border,
    shadowColor: theme.colors.primary,
    shadowOpacity: focusAnim.value * 0.25,
    shadowRadius: focusAnim.value * 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: focusAnim.value * 6,
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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingRight: theme.spacing.md,
      height: 72,
    },
    prefixContainer: {
      borderRadius: theme.radius.md,
      marginLeft: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      overflow: 'hidden',
    },
    prefixGradient: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    prefix: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textOnPrimary,
      letterSpacing: 0.5,
    },
    input: {
      ...theme.typography.h1,
      flex: 1,
      paddingVertical: 0,
      fontSize: 28,
      letterSpacing: -0.5,
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
      <Animated.View style={[styles.inputContainer, animatedBorder, style as any]}>
        <View style={styles.prefixContainer}>
          <LinearGradient
            colors={theme.colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.prefixGradient}
          >
            <Text style={styles.prefix}>Rp</Text>
          </LinearGradient>
        </View>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="numeric"
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            focusAnim.value = withTiming(1, { duration: 200 });
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
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
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';

interface ChartToggleProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export const ChartToggle: React.FC<ChartToggleProps> = ({ options, value, onChange }) => {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.8}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
              isSelected && option.value === 'income' && styles.optionIncome,
              isSelected && option.value === 'expense' && styles.optionExpense,
            ]}
          >
            <Text
              style={[
                styles.text,
                isSelected && styles.textSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionIncome: {
    backgroundColor: theme.colors.income,
  },
  optionExpense: {
    backgroundColor: theme.colors.expense,
  },
  text: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  textSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

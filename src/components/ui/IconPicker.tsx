import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';

export const ICON_OPTIONS = [
  'cash-outline', 'card-outline', 'wallet-outline', 'phone-portrait-outline',
  'briefcase-outline', 'home-outline', 'car-outline', 'trending-up-outline',
  'business-outline', 'bar-chart-outline', 'gift-outline', 'rocket-outline',
  'cart-outline', 'shield-checkmark-outline', 'server-outline', 'hardware-chip-outline',
  'book-outline', 'medical-outline', 'airplane-outline', 'ellipsis-horizontal-circle-outline',
];

export const COLOR_OPTIONS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#6366F1', '#EC4899', '#00D09C', '#F97316', '#38BDF8',
  '#9CA3AF', '#00B4D8',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  color?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, color = '#6366F1' }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ikon</Text>
      <View style={styles.grid}>
        {ICON_OPTIONS.map((i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            style={[styles.iconButton, value === i && { borderColor: color }]}
            onPress={() => onChange(i)}
          >
            <Ionicons name={i as any} size={22} color={value === i ? color : theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Warna</Text>
      <View style={styles.colorRow}>
        {COLOR_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            activeOpacity={0.7}
            style={[styles.colorButton, { backgroundColor: c }, value === c && styles.colorActive]}
            onPress={() => onChange(c)}
          >
            {value === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  label: {
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorActive: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
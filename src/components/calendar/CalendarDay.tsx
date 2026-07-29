import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import dayjs from 'dayjs';
import { CalendarDayData } from '@/types';

interface CalendarDayProps {
  date: number;
  month: number;
  year: number;
  data?: CalendarDayData;
  isToday: boolean;
  isSelected: boolean;
  onPress: (date: string) => void;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({ date, month, year, data, isToday, isSelected, onPress }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

  return (
    <TouchableOpacity
      style={[
        styles.day,
        isToday && styles.today,
        isSelected && { backgroundColor: theme.colors.primary + '30' },
      ]}
      onPress={() => onPress(dateStr)}
    >
      <Text style={[styles.dateText, isToday && { color: theme.colors.primary, fontWeight: '700' }]}>
        {date}
      </Text>
      {data && data.transactionCount > 0 && (
        <View style={styles.dataRow}>
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          {data.transactionCount > 1 && <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />}
          {data.transactionCount > 2 && <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />}
        </View>
      )}
      {data && Math.abs(data.net) >= 1000 && (
        <Text style={[styles.amount, { color: data.net >= 0 ? '#10B981' : '#EF4444' }]} numberOfLines={1}>
          {data.net >= 0 ? '+' : ''}{data.net >= 1000000 ? `${(data.net / 1000000).toFixed(1)}jt` : `${(data.net / 1000).toFixed(0)}rb`}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  day: {
    width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
    borderRadius: 8, gap: 1,
  },
  today: { borderWidth: 1, borderColor: theme.colors.primary },
  dateText: { fontSize: 12, color: theme.colors.textPrimary },
  dataRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  amount: { fontSize: 7, fontWeight: '600', lineHeight: 9 },
});
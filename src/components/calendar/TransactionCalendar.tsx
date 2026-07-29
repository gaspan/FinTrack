import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { TransactionQueries } from '@/lib/queries';
import { CalendarDayData } from '@/types';
import { CalendarDay } from './CalendarDay';
import { formatRupiah } from '@/utils/format';
import dayjs from 'dayjs';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface TransactionCalendarProps {
  onSelectDay?: (data: CalendarDayData | null) => void;
}

export const TransactionCalendar: React.FC<TransactionCalendarProps> = ({ onSelectDay }) => {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [calendarData, setCalendarData] = useState<Map<string, CalendarDayData>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadMonth = useCallback(async (month: dayjs.Dayjs) => {
    const start = month.format('YYYY-MM-DD');
    const end = month.endOf('month').format('YYYY-MM-DD');
    const queries = new TransactionQueries(db);
    const txs = await queries.getByDateRange(start, end);

    const map = new Map<string, CalendarDayData>();
    for (const tx of txs) {
      const d = tx.transaction_date;
      if (!map.has(d)) {
        map.set(d, { date: d, income: 0, expense: 0, net: 0, transactionCount: 0, transactions: [] });
      }
      const day = map.get(d)!;
      day.transactionCount++;
      day.transactions.push(tx);
      if (tx.type === 'income') day.income += tx.amount;
      else day.expense += tx.amount;
      day.net = day.income - day.expense;
    }
    setCalendarData(map);
  }, [db]);

  React.useEffect(() => { loadMonth(currentMonth); }, [currentMonth, loadMonth]);

  const goToPrevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const goToNextMonth = () => setCurrentMonth((m) => m.add(1, 'month'));

  const handlePressDay = (date: string) => {
    setSelectedDate(date);
    onSelectDay?.(calendarData.get(date) || null);
  };

  const daysInMonth = currentMonth.daysInMonth();
  const startDay = currentMonth.day();
  const todayStr = dayjs().format('YYYY-MM-DD');
  const year = currentMonth.year();
  const month = currentMonth.month();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(<View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(
      <CalendarDay
        key={d}
        date={d}
        month={month}
        year={year}
        data={calendarData.get(dateStr)}
        isToday={dateStr === todayStr}
        isSelected={dateStr === selectedDate}
        onPress={handlePressDay}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, idx) => (
          <React.Fragment key={idx}>{cell}</React.Fragment>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.sm },
  navBtn: { padding: 8 },
  monthTitle: { ...theme.typography.h3 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: '14.28%', textAlign: 'center', fontSize: 11, color: theme.colors.textSecondary, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
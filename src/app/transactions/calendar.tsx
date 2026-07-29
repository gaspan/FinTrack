import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { CalendarDayData } from '@/types';
import { TransactionCalendar } from '@/components/calendar/TransactionCalendar';
import { DayTransactionSheet } from '@/components/calendar/DayTransactionSheet';

export default function CalendarPage() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kalender</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <TransactionCalendar onSelectDay={setSelectedDay} />
      </View>

      <DayTransactionSheet
        data={selectedDay}
        visible={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        onSelectTransaction={(id) => router.push(`/transaction/${id}` as any)}
      />
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2 },
  body: { flex: 1, padding: theme.spacing.lg },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { Button } from '../ui/Button';

dayjs.locale('id');

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onChange }) => {
  const defaultStyles = useDefaultStyles('light');
  const [modalVisible, setModalVisible] = useState(false);
  
  // Local state for the picker before applying
  const [range, setRange] = useState<{ startDate: any, endDate: any }>({
    startDate: dayjs(startDate),
    endDate: dayjs(endDate)
  });

  const handleApply = () => {
    if (range.startDate && range.endDate) {
      onChange(
        dayjs(range.startDate).format('YYYY-MM-DD'),
        dayjs(range.endDate).format('YYYY-MM-DD')
      );
      setModalVisible(false);
    }
  };

  const handleQuickSelect = (type: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    let start, end;
    const now = dayjs();
    
    if (type === 'thisMonth') {
      start = now.startOf('month');
      end = now.endOf('month');
    } else if (type === 'lastMonth') {
      start = now.subtract(1, 'month').startOf('month');
      end = now.subtract(1, 'month').endOf('month');
    } else {
      start = now.startOf('year');
      end = now.endOf('year');
    }

    setRange({ startDate: start, endDate: end });
  };

  const isCurrentMonth = dayjs(startDate).isSame(dayjs().startOf('month'), 'day') && 
                         dayjs(endDate).isSame(dayjs().endOf('month'), 'day');
                         
  const displayText = isCurrentMonth 
    ? dayjs(startDate).format('MMMM YYYY')
    : `${dayjs(startDate).format('DD MMM')} - ${dayjs(endDate).format('DD MMM YYYY')}`;

  return (
    <>
      <TouchableOpacity 
        style={styles.triggerButton} 
        onPress={() => {
          setRange({ startDate: dayjs(startDate), endDate: dayjs(endDate) });
          setModalVisible(true);
        }}
      >
        <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} style={styles.icon} />
        <Text style={styles.triggerText}>{displayText}</Text>
        <Ionicons name="chevron-down-outline" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Waktu</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickFilters}>
              <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect('thisMonth')}>
                <Text style={styles.quickChipText}>Bulan Ini</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect('lastMonth')}>
                <Text style={styles.quickChipText}>Bulan Lalu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect('thisYear')}>
                <Text style={styles.quickChipText}>Tahun Ini</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <DateTimePicker
                mode="range"
                startDate={range.startDate}
                endDate={range.endDate}
                onChange={(params: any) => setRange(params)}
                styles={{
                  ...defaultStyles,
                  header: { backgroundColor: '#4A90D9', borderBottomWidth: 0 },
                  month_selector_label: { color: '#FFFFFF', fontWeight: '600' },
                  year_selector_label: { color: '#FFFFFF', fontWeight: '600' },
                  button_prev_image: { tintColor: '#FFFFFF' },
                  button_next_image: { tintColor: '#FFFFFF' },
                  weekdays: { backgroundColor: '#F0F4FF' },
                  weekday_label: { color: '#4A90D9', fontWeight: '600' },
                  day: { backgroundColor: '#FFFFFF' },
                  day_label: { color: '#1A1A2E' },
                  selected: { backgroundColor: '#4A90D9', borderRadius: 8 },
                  selected_label: { color: '#FFFFFF', fontWeight: '700' },
                  today: { borderColor: '#4A90D9', borderWidth: 2, borderRadius: 8 },
                  today_label: { color: '#4A90D9', fontWeight: '700' },
                  days: { backgroundColor: '#F8FAFF' },
                }}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button 
                title="Terapkan" 
                fullWidth 
                onPress={handleApply} 
                disabled={!range.startDate || !range.endDate}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  triggerText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h3,
  },
  quickFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  quickChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickChipText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  pickerContainer: {
    marginHorizontal: -theme.spacing.sm, // slight adjust for datetime picker padding
  },
  modalFooter: {
    marginTop: theme.spacing.lg,
  }
});

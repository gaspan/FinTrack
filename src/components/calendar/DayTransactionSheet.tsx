import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { CalendarDayData } from '@/types';
import { formatRupiah } from '@/utils/format';

interface DayTransactionSheetProps {
  data: CalendarDayData | null;
  visible: boolean;
  onClose: () => void;
  onSelectTransaction?: (txId: number) => void;
}

export const DayTransactionSheet: React.FC<DayTransactionSheetProps> = ({ data, visible, onClose, onSelectTransaction }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (!visible || !data) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{data.date}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {data.transactionCount === 0 ? (
          <Text style={styles.empty}>Tidak ada transaksi</Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pemasukan: <Text style={{ color: '#10B981' }}>{formatRupiah(data.income)}</Text></Text>
              <Text style={styles.summaryLabel}>Pengeluaran: <Text style={{ color: '#EF4444' }}>{formatRupiah(data.expense)}</Text></Text>
            </View>

            <FlatList
              data={data.transactions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.txItem}
                  onPress={() => onSelectTransaction?.(item.id)}
                >
                  <View style={[styles.txIcon, { backgroundColor: item.category_color + '20' }]}>
                    <Ionicons name={item.category_icon as any} size={16} color={item.category_color} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName}>{item.category_name}</Text>
                    {item.notes && <Text style={styles.txNotes} numberOfLines={1}>{item.notes}</Text>}
                  </View>
                  <Text style={[styles.txAmount, { color: item.type === 'income' ? '#10B981' : '#EF4444' }]}>
                    {item.type === 'income' ? '+' : '-'}{formatRupiah(item.amount)}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </>
        )}
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: theme.spacing.lg, maxHeight: '70%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  title: { ...theme.typography.h3 },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, paddingVertical: 40 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  summaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  txIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txName: { fontSize: 13, fontWeight: '500' },
  txNotes: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  txAmount: { fontSize: 13, fontWeight: '600' },
});
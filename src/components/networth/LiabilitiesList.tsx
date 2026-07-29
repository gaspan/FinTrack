import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, type Theme } from '@/constants/theme';
import { Liability } from '@/types';
import { formatRupiah } from '@/utils/format';

interface LiabilitiesListProps {
  items: Liability[];
  onDelete: (id: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  loan: 'Pinjaman',
  credit_card: 'Kartu Kredit',
  debt: 'Utang',
  other: 'Lainnya',
};

export const LiabilitiesList: React.FC<LiabilitiesListProps> = ({ items, onDelete }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const handleDelete = (item: Liability) => {
    Alert.alert('Hapus Utang', `Hapus "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  if (items.length === 0) {
    return <Text style={styles.empty}>Belum ada utang</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.item}
          onPress={() => router.push(`/liability/${item.id}` as any)}
          onLongPress={() => handleDelete(item)}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.type}>{TYPE_LABELS[item.type] || item.type}</Text>
          </View>
          <Text style={styles.value}>-{formatRupiah(item.current_balance)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  list: { gap: 8 },
  empty: { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontWeight: '600', fontSize: 14 },
  type: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  value: { fontWeight: '700', fontSize: 14, color: '#EF4444' },
});
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { TransactionQueries } from '@/lib/queries';
import { TransactionWithDetails } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiah } from '@/utils/format';

dayjs.locale('id');

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<{ title: string, data: TransactionWithDetails[] }[]>([]);

  const loadTransactions = useCallback(async () => {
    try {
      const queries = new TransactionQueries(db);
      const allTx = await queries.getAllWithDetails();
      
      // Group by date
      const grouped = allTx.reduce((acc, tx) => {
        const dateStr = dayjs(tx.transaction_date).format('dddd, DD MMMM YYYY');
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(tx);
        return acc;
      }, {} as Record<string, TransactionWithDetails[]>);

      const sectionData = Object.keys(grouped).map(date => ({
        title: date,
        data: grouped[date]
      }));

      setSections(sectionData);
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatRp = formatRupiah;

  const renderItem = ({ item }: { item: TransactionWithDetails }) => (
    <TouchableOpacity 
      style={styles.txItem}
      activeOpacity={0.7}
      onPress={() => router.push(`/transaction/${item.id}`)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.category_color + '20' }]}>
        <Ionicons name={item.category_icon as any} size={24} color={item.category_color} />
      </View>
      <View style={styles.txDetails}>
        <Text style={styles.txCategory}>{item.category_name}</Text>
        <Text style={styles.txNotes} numberOfLines={1}>{item.notes || item.wallet_name}</Text>
      </View>
      <View style={styles.txAmountContainer}>
        <Text style={[
          styles.txAmount,
          { color: item.type === 'income' ? theme.colors.income : theme.colors.textPrimary }
        ]}>
          {item.type === 'income' ? '+' : '-'}{formatRp(item.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {sections.length === 0 && !refreshing ? (
        <EmptyState 
          title="Belum Ada Transaksi"
          message="Catat transaksi pertama Anda dengan menekan tombol Tambah di bawah."
          icon="document-text-outline"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.caption,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  txDetails: {
    flex: 1,
  },
  txCategory: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  txNotes: {
    ...theme.typography.bodySmall,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...theme.typography.subtitle,
    fontWeight: 'bold',
  }
});

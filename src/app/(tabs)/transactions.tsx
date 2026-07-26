import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { TransactionQueries, CategoryQueries, WalletQueries } from '@/lib/queries';
import { TransactionWithDetails, Category, Wallet } from '@/types';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { formatRupiah } from '@/utils/format';
import { hapticLight, hapticMedium } from '@/utils/haptic';
import { ListSkeleton } from '@/components/ui/Skeleton';

dayjs.locale('id');

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTransactions, setAllTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterWallet, setFilterWallet] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, cats, walls] = await Promise.all([
        new TransactionQueries(db).getAllWithDetails(),
        new CategoryQueries(db).getAll(),
        new WalletQueries(db).getAll(),
      ]);
      setAllTransactions(txs);
      setCategories(cats);
      setWallets(walls);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = allTransactions;

    if (startDate && endDate) {
      result = result.filter(t => t.transaction_date >= startDate && t.transaction_date <= endDate);
    }

    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    if (filterCategory !== null) {
      result = result.filter(t => t.category_id === filterCategory);
    }
    if (filterWallet !== null) {
      result = result.filter(t => t.wallet_id === filterWallet);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(t =>
        t.category_name.toLowerCase().includes(q) ||
        t.wallet_name.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
      );
    }
    return result;
  }, [allTransactions, filterType, filterCategory, filterWallet, searchText, startDate, endDate]);

  const summaryTotal = useMemo(() => {
    let income = 0, expense = 0;
    filtered.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    return { count: filtered.length, income, expense };
  }, [filtered]);

  const sections = useMemo(() => {
    const grouped = filtered.reduce((acc, tx) => {
      const dateStr = dayjs(tx.transaction_date).format('dddd, DD MMMM YYYY');
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {} as Record<string, TransactionWithDetails[]>);

    return Object.keys(grouped).map(date => ({
      title: date,
      data: grouped[date]
    }));
  }, [filtered]);

  const formatRp = formatRupiah;

  const clearFilters = () => {
    setFilterCategory(null);
    setFilterWallet(null);
    setFilterType('all');
    setSearchText('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilter = filterCategory !== null || filterWallet !== null || filterType !== 'all' || searchText.trim().length > 0 || !!startDate;

  const handleDeleteTx = async (id: number) => {
    try {
      await new TransactionQueries(db).delete(id);
      hapticMedium();
      loadData();
    } catch (e) { console.error(e); }
  };

  const renderItem = ({ item }: { item: TransactionWithDetails }) => (
    <TouchableOpacity 
      style={styles.txItem}
      activeOpacity={0.7}
      onPress={() => router.push(`/transaction/${item.id}` as any)}
      onLongPress={() => {
        hapticMedium();
        Alert.alert('Transaksi', item.category_name, [
          { text: 'Batal', style: 'cancel' },
          { text: 'Edit', onPress: () => router.push(`/transaction/edit/${item.id}` as any) },
          { text: 'Hapus', style: 'destructive', onPress: () => Alert.alert('Konfirmasi', 'Yakin hapus?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => handleDeleteTx(item.id) },
          ])},
        ]);
      }}
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari transaksi..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Range Filter */}
      <View style={styles.dateRangeRow}>
        <DateRangeFilter
          startDate={startDate || dayjs().startOf('month').format('YYYY-MM-DD')}
          endDate={endDate || dayjs().endOf('month').format('YYYY-MM-DD')}
          onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'income', 'expense'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, filterType === t && styles.filterChipActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                {t === 'all' ? 'Semua' : t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </Text>
            </TouchableOpacity>
          ))}
          {categories.filter(c => c.type === 'expense' || c.type === 'income').map(cat => (
            <TouchableOpacity
              key={`cat-${cat.id}`}
              style={[styles.filterChip, filterCategory === cat.id && styles.filterChipActive]}
              onPress={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
            >
              <Ionicons name={cat.icon as any} size={14} color={filterCategory === cat.id ? '#FFF' : cat.color} style={{ marginRight: 4 }} />
              <Text style={[styles.filterChipText, filterCategory === cat.id && styles.filterChipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
          {wallets.map(w => (
            <TouchableOpacity
              key={`wal-${w.id}`}
              style={[styles.filterChip, filterWallet === w.id && styles.filterChipActive]}
              onPress={() => setFilterWallet(filterWallet === w.id ? null : w.id)}
            >
              {w.icon && <Ionicons name={w.icon as any} size={14} color={filterWallet === w.id ? '#FFF' : w.color || theme.colors.textSecondary} style={{ marginRight: 4 }} />}
              <Text style={[styles.filterChipText, filterWallet === w.id && styles.filterChipTextActive]}>{w.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {sections.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {summaryTotal.count} transaksi
          </Text>
          <View style={styles.summaryDivider} />
          <Text style={[styles.summaryText, { color: theme.colors.income }]}>
            +{formatRp(summaryTotal.income)}
          </Text>
          <Text style={[styles.summaryText, { color: theme.colors.textPrimary }]}>
            -{formatRp(summaryTotal.expense)}
          </Text>
        </View>
      )}

      {hasActiveFilter && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
          <Text style={styles.clearBtnText}>Hapus semua filter</Text>
        </TouchableOpacity>
      )}

      {loading && !refreshing ? (
        <ListSkeleton />
      ) : sections.length === 0 && !refreshing ? (
        <EmptyState 
          title={hasActiveFilter ? "Tidak Ada Hasil" : "Belum Ada Transaksi"}
          message={hasActiveFilter ? "Coba ubah kata kunci atau filter" : "Catat transaksi pertama Anda dengan menekan tombol Tambah di bawah."}
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchContainer: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md, height: 40,
  },
  searchInput: { flex: 1, ...theme.typography.body, color: theme.colors.textPrimary, marginLeft: theme.spacing.sm, paddingVertical: 0 },
  dateRangeRow: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xs },
  filterRow: { paddingVertical: theme.spacing.sm, paddingLeft: theme.spacing.md, marginBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.round, backgroundColor: theme.colors.surface, borderWidth: 1,
    borderColor: theme.colors.border, marginRight: theme.spacing.sm,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF' },
  clearBtn: { alignSelf: 'center', marginBottom: theme.spacing.xs },
  clearBtnText: { ...theme.typography.caption, color: theme.colors.primary, textDecorationLine: 'underline' },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated, gap: theme.spacing.sm,
  },
  summaryText: { ...theme.typography.caption, fontWeight: '600' },
  summaryDivider: { width: 1, height: 12, backgroundColor: theme.colors.border },
  listContent: { paddingBottom: theme.spacing.xl },
  sectionHeader: {
    backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  sectionTitle: { ...theme.typography.caption, fontWeight: 'bold', textTransform: 'uppercase' },
  txItem: {
    flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  iconContainer: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  txDetails: { flex: 1 },
  txCategory: { ...theme.typography.body, fontWeight: '600', marginBottom: 2 },
  txNotes: { ...theme.typography.bodySmall },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { ...theme.typography.subtitle, fontWeight: 'bold' },
});

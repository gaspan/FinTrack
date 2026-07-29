import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { TransactionQueries, CategoryQueries, WalletQueries, TagQueries } from '@/lib/queries';
import { TransactionWithDetails, Category, Wallet, Tag } from '@/types';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiah } from '@/utils/format';
import { hapticMedium } from '@/utils/haptic';
import { ListSkeleton } from '@/components/ui/Skeleton';

dayjs.locale('id');

const PAGE_SIZE = 20;

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterWallet, setFilterWallet] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const getFilterParams = useCallback(() => ({
    startDate: startDate || dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: endDate || dayjs().endOf('month').format('YYYY-MM-DD'),
    type: filterType,
    categoryId: filterCategory,
    walletId: filterWallet,
    searchText: searchText.trim() || undefined,
    tagIds: filterTagIds.length > 0 ? filterTagIds : undefined,
  }), [startDate, endDate, filterType, filterCategory, filterWallet, searchText, filterTagIds]);

  const loadInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      const params = getFilterParams();
      const [result, cats, walls, tags] = await Promise.all([
        new TransactionQueries(db).getAllPaginated({ ...params, limit: PAGE_SIZE, offset: 0 }),
        new CategoryQueries(db).getAll(),
        new WalletQueries(db).getAll(),
        new TagQueries(db).getAll(),
      ]);
      setTransactions(result.data);
      setTotalFiltered(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(0);
      setCategories(cats);
      setWallets(walls);
      setAllTags(tags);
    } catch (e) { console.error(e); }
    finally { setInitialLoading(false); }
  }, [db, getFilterParams]);

  useFocusEffect(useCallback(() => { loadInitialData(); }, [loadInitialData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const params = getFilterParams();
      const result = await new TransactionQueries(db).getAllPaginated({
        ...params,
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      });
      setTransactions(prev => [...prev, ...result.data]);
      setTotalFiltered(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  };

  const summaryTotal = useMemo(() => {
    let income = 0, expense = 0;
    transactions.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    return { count: totalFiltered, income, expense };
  }, [transactions, totalFiltered]);

  const sections = useMemo(() => {
    const grouped = transactions.reduce((acc, tx) => {
      const dateStr = dayjs(tx.transaction_date).format('dddd, DD MMMM YYYY');
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {} as Record<string, TransactionWithDetails[]>);

    return Object.keys(grouped).map(date => ({
      title: date,
      data: grouped[date]
    }));
  }, [transactions]);

  const formatRp = formatRupiah;

  const clearFilters = () => {
    setFilterCategory(null);
    setFilterWallet(null);
    setFilterType('all');
    setFilterTagIds([]);
    setSearchText('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilter = filterCategory !== null || filterWallet !== null || filterType !== 'all' || filterTagIds.length > 0 || searchText.trim().length > 0 || !!startDate || !!endDate;

  const toggleTagFilter = (tagId: number) => {
    setFilterTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleDeleteTx = async (id: number) => {
    try {
      await new TransactionQueries(db).delete(id);
      hapticMedium();
      loadInitialData();
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
        {item.tags && item.tags.length > 0 && (
          <View style={styles.itemTagRow}>
            {item.tags.slice(0, 3).map(tag => (
              <View key={tag.id} style={[styles.itemTagChip, { backgroundColor: tag.color + '20', borderColor: tag.color }]}>
                <Text style={[styles.itemTagText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.itemTagMore}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.footerText}>Memuat lebih banyak...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (initialLoading) return <ListSkeleton />;
    return (
      <EmptyState 
        title={hasActiveFilter ? "Tidak Ada Hasil" : "Belum Ada Transaksi"}
        message={hasActiveFilter ? "Coba ubah kata kunci atau filter" : "Catat transaksi pertama Anda dengan menekan tombol Tambah di bawah."}
        icon="document-text-outline"
      />
    );
  };

  return (
    <View style={styles.container}>
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

      <View style={styles.dateRangeRow}>
        <DateRangeFilter
          startDate={startDate || dayjs().startOf('month').format('YYYY-MM-DD')}
          endDate={endDate || dayjs().endOf('month').format('YYYY-MM-DD')}
          onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
        />
      </View>

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
          {allTags.length === 0 ? (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>Tag: belum ada</Text>
            </View>
          ) : allTags.map(tag => (
            <TouchableOpacity
              key={`tag-${tag.id}`}
              style={[styles.filterChip, filterTagIds.includes(tag.id) && { backgroundColor: tag.color, borderColor: tag.color }]}
              onPress={() => toggleTagFilter(tag.id)}
            >
              <Text style={[styles.filterChipText, filterTagIds.includes(tag.id) && styles.filterChipTextActive]}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {transactions.length > 0 && (
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

      {initialLoading && !refreshing ? (
        <ListSkeleton />
      ) : !initialLoading && transactions.length === 0 ? (
        renderEmpty()
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
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
  itemTagRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4,
  },
  itemTagChip: {
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: theme.radius.round, borderWidth: 0.5,
  },
  itemTagText: {
    fontSize: 10, fontWeight: '600',
  },
  itemTagMore: {
    fontSize: 10, color: theme.colors.textSecondary,
  },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { ...theme.typography.subtitle, fontWeight: 'bold' },
  footerLoader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: theme.spacing.md, gap: theme.spacing.sm,
  },
  footerText: { ...theme.typography.caption, color: theme.colors.textSecondary },
});
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { TransactionQueries, CategoryQueries, WalletQueries, TagQueries } from '@/lib/queries';
import { TransactionWithDetails, Category, Wallet, Tag } from '@/types';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiah } from '@/utils/format';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { hapticHeavy, hapticMedium } from '@/utils/haptic';
import { staggerDelay, shouldReduceMotion } from '@/utils/motion';
import { ListSkeleton } from '@/components/ui/Skeleton';

dayjs.locale('id');

const PAGE_SIZE = 20;

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;
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
        new TransactionQueries(db, bookId).getAllPaginated({ ...params, limit: PAGE_SIZE, offset: 0 }),
        new CategoryQueries(db, bookId).getAll(),
        new WalletQueries(db, bookId).getAll(),
        new TagQueries(db, bookId).getAll(),
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
  }, [db, bookId, getFilterParams]);

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
      const result = await new TransactionQueries(db, bookId).getAllPaginated({
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
      hapticHeavy();
      await new TransactionQueries(db, bookId).delete(id);
      loadInitialData();
    } catch (e) { console.error(e); }
  };

  const renderItem = ({ item, index }: { item: TransactionWithDetails; index: number }) => (
    <Animated.View entering={shouldReduceMotion() ? undefined : FadeInDown.duration(250).delay(staggerDelay(index))}>
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
      <LinearGradient
        colors={[item.category_color + '25', item.category_color + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons name={item.category_icon as any} size={22} color={item.category_color} />
      </LinearGradient>
      <View style={styles.txDetails}>
        <Text style={styles.txCategory}>{item.category_name}</Text>
        <Text style={styles.txNotes} numberOfLines={1}>{item.notes || item.wallet_name}</Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.itemTagRow}>
            {item.tags.slice(0, 3).map(tag => (
              <View key={tag.id} style={[styles.itemTagChip, { backgroundColor: tag.color + '18', borderColor: tag.color + '40' }]}>
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
    </Animated.View>
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
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari transaksi..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
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
              activeOpacity={0.7}
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
              activeOpacity={0.7}
            >
              <Ionicons name={cat.icon as any} size={14} color={filterCategory === cat.id ? theme.colors.textOnPrimary : cat.color} style={{ marginRight: 4 }} />
              <Text style={[styles.filterChipText, filterCategory === cat.id && styles.filterChipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
          {wallets.map(w => (
            <TouchableOpacity
              key={`wal-${w.id}`}
              style={[styles.filterChip, filterWallet === w.id && styles.filterChipActive]}
              onPress={() => setFilterWallet(filterWallet === w.id ? null : w.id)}
              activeOpacity={0.7}
            >
              {w.icon && <Ionicons name={w.icon as any} size={14} color={filterWallet === w.id ? theme.colors.textOnPrimary : w.color || theme.colors.textSecondary} style={{ marginRight: 4 }} />}
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
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterTagIds.includes(tag.id) && styles.filterChipTextActive]}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {transactions.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryChip}>
            <Ionicons name="layers-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.summaryText}>
              {summaryTotal.count} transaksi
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <Text style={[styles.summaryText, { color: theme.colors.income, fontWeight: '700' }]}>
            +{formatRp(summaryTotal.income)}
          </Text>
          <Text style={[styles.summaryText, { color: theme.colors.expense, fontWeight: '700' }]}>
            -{formatRp(summaryTotal.expense)}
          </Text>
        </View>
      )}

      {hasActiveFilter && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.7}>
          <Ionicons name="close-circle-outline" size={14} color={theme.colors.primary} />
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
              <View style={styles.sectionAccent} />
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
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.borderSubtle, marginLeft: 84 }} />}
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
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md, height: 44,
  },
  searchInput: { flex: 1, ...theme.typography.body, color: theme.colors.textPrimary, marginLeft: theme.spacing.sm, paddingVertical: 0 },
  dateRangeRow: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xs },
  filterRow: { paddingVertical: theme.spacing.sm, paddingLeft: theme.spacing.md, marginBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.round, backgroundColor: theme.colors.surface, borderWidth: 1,
    borderColor: theme.colors.border, marginRight: theme.spacing.sm,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: theme.colors.textOnPrimary },
  clearBtn: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 4, marginBottom: theme.spacing.xs, paddingVertical: 4, paddingHorizontal: theme.spacing.sm },
  clearBtnText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '600' },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceGlass, gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryText: { ...theme.typography.caption, fontWeight: '600' },
  summaryDivider: { width: 1, height: 12, backgroundColor: theme.colors.border },
  listContent: { paddingBottom: theme.spacing.xl + 80 },
  sectionHeader: {
    backgroundColor: theme.colors.surfaceElevated + 'F0',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccent: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  sectionTitle: { ...theme.typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.primary },
  txItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  iconContainer: {
    width: 50, height: 50, borderRadius: theme.radius.lg, justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  txDetails: { flex: 1 },
  txCategory: { ...theme.typography.body, fontWeight: '700', marginBottom: 3, fontSize: 15 },
  txNotes: { ...theme.typography.bodySmall, color: theme.colors.textMuted },
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
  txAmountContainer: { alignItems: 'flex-end', marginLeft: theme.spacing.sm },
  txAmount: { ...theme.typography.subtitle, fontWeight: '800', fontFamily: theme.typography.h1.fontFamily, fontSize: 15 },
  footerLoader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: theme.spacing.md, gap: theme.spacing.sm,
  },
  footerText: { ...theme.typography.caption, color: theme.colors.textSecondary },
});
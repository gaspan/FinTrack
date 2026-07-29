import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { SubscriptionQueries } from '@/lib/queries';
import { Subscription } from '@/types';
import { formatRupiah } from '@/utils/format';
import { Card } from '@/components/ui/Card';

export default function SubscriptionsPage() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const queries = new SubscriptionQueries(db);

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const loadData = useCallback(async () => {
    const [data, total] = await Promise.all([
      queries.getAll(filter === 'all'),
      queries.getTotalMonthly(),
    ]);
    setSubs(data);
    setTotalMonthly(total);
  }, [db, filter]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCancel = (sub: Subscription) => {
    Alert.alert('Batalkan Langganan', `Berhenti berlangganan "${sub.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Batalkan', style: 'destructive', onPress: () => queries.cancel(sub.id).then(loadData) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Langganan</Text>
        <TouchableOpacity onPress={() => router.push('/subscription/new' as any)}>
          <Ionicons name="add" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Langganan / Bulan</Text>
        <Text style={styles.summaryValue}>{formatRupiah(totalMonthly)}</Text>
        <Text style={styles.summarySub}>/{subs.filter(s => s.is_active).length} layanan aktif</Text>
      </Card>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, filter === 'active' && styles.filterActive]} onPress={() => setFilter('active')}>
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Aktif</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'all' && styles.filterActive]} onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Semua</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {subs.length === 0 && (
          <Text style={styles.empty}>Belum ada langganan</Text>
        )}
        {subs.map((sub) => (
          <TouchableOpacity
            key={sub.id}
            style={styles.item}
            onPress={() => router.push(`/subscription/${sub.id}` as any)}
            onLongPress={() => sub.is_active ? handleCancel(sub) : null}
          >
            <View style={[styles.iconWrap, { backgroundColor: sub.color + '20' }]}>
              <Ionicons name={sub.icon as any} size={22} color={sub.color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{sub.name}</Text>
              <Text style={styles.meta}>
                {formatRupiah(sub.amount)}/{sub.billing_cycle === 'monthly' ? 'bln' : sub.billing_cycle === 'yearly' ? 'thn' : '3bln'}
                {!sub.is_active ? ' (Dibatalkan)' : ''}
              </Text>
            </View>
            {sub.is_active && (
              <Text style={styles.nextDate}>Tagihan {sub.next_billing_date}</Text>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2 },
  summaryCard: { margin: theme.spacing.lg, padding: theme.spacing.lg, alignItems: 'center', backgroundColor: theme.colors.surfaceElevated },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 28, fontWeight: '800', color: theme.colors.primary, marginVertical: 4 },
  summarySub: { fontSize: 11, color: theme.colors.textSecondary },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.colors.surface },
  filterActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, color: theme.colors.textSecondary },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  list: { paddingHorizontal: theme.spacing.lg },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 40, fontStyle: 'italic' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontWeight: '600', fontSize: 14 },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  nextDate: { fontSize: 11, color: theme.colors.textSecondary },
});
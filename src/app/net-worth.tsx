import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/constants/theme';
import { NetWorthQueries } from '@/lib/queries';
import { Asset, Liability, NetWorthSnapshot } from '@/types';
import { formatRupiah } from '@/utils/format';
import { NetWorthChart } from '@/components/networth/NetWorthChart';
import { AssetsList } from '@/components/networth/AssetsList';
import { LiabilitiesList } from '@/components/networth/LiabilitiesList';

export default function NetWorthPage() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const queries = new NetWorthQueries(db);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [netWorth, setNetWorth] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [history, setHistory] = useState<NetWorthSnapshot[]>([]);

  const loadData = useCallback(async () => {
    const [worth, assetsData, liabData, hist] = await Promise.all([
      queries.getCurrentNetWorth(),
      queries.getAssets(),
      queries.getLiabilities(),
      queries.getNetWorthHistory(),
    ]);
    setTotalAssets(worth.totalAssets);
    setTotalLiabilities(worth.totalLiabilities);
    setNetWorth(worth.netWorth);
    setAssets(assetsData);
    setLiabilities(liabData);
    setHistory(hist);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await queries.ensureMonthlySnapshot();
    setRefreshing(false);
  };

  const handleDeleteAsset = async (id: number) => {
    await queries.deleteAsset(id);
    await loadData();
  };

  const handleDeleteLiability = async (id: number) => {
    await queries.deleteLiability(id);
    await loadData();
  };

  const isPositive = netWorth >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kekayaan Bersih</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.netWorthCard, { backgroundColor: isPositive ? '#065F4620' : '#DC262620' }]}>
          <Text style={styles.netWorthLabel}>Total Kekayaan Bersih</Text>
          <Text style={[styles.netWorthAmount, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {isPositive ? '' : '-'}Rp {Math.abs(netWorth).toLocaleString('id-ID')}
          </Text>
          <View style={styles.netWorthRow}>
            <View style={styles.netWorthCol}>
              <Text style={styles.netWorthColLabel}>Total Aset</Text>
              <Text style={[styles.netWorthColValue, { color: '#10B981' }]}>
                +Rp {totalAssets.toLocaleString('id-ID')}
              </Text>
            </View>
            <View style={styles.netWorthCol}>
              <Text style={styles.netWorthColLabel}>Total Utang</Text>
              <Text style={[styles.netWorthColValue, { color: '#EF4444' }]}>
                -Rp {totalLiabilities.toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
        </View>

        <NetWorthChart data={history} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aset</Text>
          <TouchableOpacity onPress={() => router.push('/asset/new' as any)}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <AssetsList items={assets} onDelete={handleDeleteAsset} />

        <View style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
          <Text style={styles.sectionTitle}>Utang</Text>
          <TouchableOpacity onPress={() => router.push('/liability/new' as any)}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <LiabilitiesList items={liabilities} onDelete={handleDeleteLiability} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, flex: 1, textAlign: 'center' },
  scroll: { padding: theme.spacing.lg },
  netWorthCard: { borderRadius: 16, padding: theme.spacing.lg, marginBottom: theme.spacing.lg },
  netWorthLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  netWorthAmount: { fontSize: 28, fontWeight: '800', marginBottom: theme.spacing.md },
  netWorthRow: { flexDirection: 'row', gap: theme.spacing.lg },
  netWorthCol: { flex: 1 },
  netWorthColLabel: { fontSize: 11, color: theme.colors.textSecondary },
  netWorthColValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { ...theme.typography.h3 },
});
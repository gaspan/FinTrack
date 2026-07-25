import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';

import { theme } from '@/constants/theme';
import { exportBackup, importBackup } from '@/features/export/backupRestore';
import { formatRupiah } from '@/utils/format';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);

  useFocusEffect(useCallback(() => {}, []));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Pengaturan</Text>

      {/* Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manajemen</Text>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/wallets' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.income + '20' }]}>
              <Ionicons name="wallet-outline" size={20} color={theme.colors.income} />
            </View>
            <Text style={styles.itemTitle}>Dompet</Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemSub}>Kelola dompet</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/categories' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name="grid-outline" size={20} color={theme.colors.warning} />
            </View>
            <Text style={styles.itemTitle}>Kategori</Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemSub}>Atur kategori transaksi</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fitur</Text>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/recurring' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="sync-outline" size={20} color="#6366F1" />
            </View>
            <Text style={styles.itemTitle}>Transaksi Berulang</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/transfer' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#38BDF820' }]}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#38BDF8" />
            </View>
            <Text style={styles.itemTitle}>Transfer Antar Dompet</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/export' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="download-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.itemTitle}>Ekspor Laporan (Excel)</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <TouchableOpacity style={styles.item} onPress={async () => {
          setBackingUp(true);
          try { await exportBackup(db); } catch (e: any) { if (e?.message !== 'Pembatalan') Alert.alert('Error', 'Gagal backup'); }
          finally { setBackingUp(false); }
        }} disabled={backingUp}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.success} />
            </View>
            <Text style={styles.itemTitle}>Backup Data</Text>
          </View>
          <Text style={styles.itemSub}>{backingUp ? 'Menyiapkan...' : ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={async () => {
          setImporting(true);
          try {
            const msg = await importBackup(db);
            Alert.alert('Restore Berhasil', msg);
          } catch (e: any) {
            if (e?.message !== 'Pembatalan') Alert.alert('Error', e?.message || 'Gagal restore');
          }
          finally { setImporting(false); }
        }} disabled={importing}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#EC489920' }]}>
              <Ionicons name="cloud-download-outline" size={20} color="#EC4899" />
            </View>
            <Text style={styles.itemTitle}>Restore Data</Text>
          </View>
          <Text style={styles.itemSub}>{importing ? 'Memproses...' : ''}</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tentang</Text>
        <View style={styles.item}>
          <Text style={styles.itemTitle}>FinTrack Version</Text>
          <Text style={styles.versionText}>v1.1.0</Text>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pageTitle: { ...theme.typography.h1, padding: theme.spacing.md, paddingBottom: 0 },
  section: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md },
  sectionTitle: { ...theme.typography.subtitle, marginBottom: theme.spacing.sm, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radius.md, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  itemTitle: { ...theme.typography.body, fontWeight: '500' },
  itemSub: { ...theme.typography.caption },
  versionText: { ...theme.typography.bodySmall },
});

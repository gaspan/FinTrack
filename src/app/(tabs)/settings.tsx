import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { exportBackup, importBackup, LAST_BACKUP_DATE_KEY } from '@/features/export/backupRestore';
import { AUTO_BACKUP_ENABLED_KEY, BACKUP_INTERVAL_KEY, LAST_AUTO_BACKUP_KEY, BACKUP_INTERVALS } from '@/features/cloud-backup/backupScheduler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryQueries } from '@/lib/queries';
import { Category, PayrollSettings } from '@/types';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

const SAFE_TO_SPEND_KEY = 'safe_to_spend_enabled';
const PAYROLL_ENABLED_KEY = 'payroll_enabled';
const PAYROLL_DAY_KEY = 'payroll_day';
const PAYROLL_CATEGORY_KEY = 'payroll_category_id';

export default function SettingsScreen() {
  const { theme, themeName, cycleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [safeToSpendEnabled, setSafeToSpendEnabled] = useState(true);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>({
    enabled: false,
    salaryDay: 25,
    salaryCategoryId: null,
  });
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupInterval, setBackupInterval] = useState(7);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(SAFE_TO_SPEND_KEY).then((val) => {
      setSafeToSpendEnabled(val !== 'false');
    });

    const categoryQueries = new CategoryQueries(db);
    categoryQueries.getByType('income').then(setIncomeCategories);

    Promise.all([
      AsyncStorage.getItem(PAYROLL_ENABLED_KEY),
      AsyncStorage.getItem(PAYROLL_DAY_KEY),
      AsyncStorage.getItem(PAYROLL_CATEGORY_KEY),
    ]).then(([enabled, day, categoryId]) => {
      setPayrollSettings({
        enabled: enabled !== 'false',
        salaryDay: day ? parseInt(day, 10) : 25,
        salaryCategoryId: categoryId ? parseInt(categoryId, 10) : null,
      });
    });

    Promise.all([
      AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY),
      AsyncStorage.getItem(BACKUP_INTERVAL_KEY),
      AsyncStorage.getItem(LAST_BACKUP_DATE_KEY),
      AsyncStorage.getItem(LAST_AUTO_BACKUP_KEY),
    ]).then(([autoEnabled, interval, lastManual, lastAuto]) => {
      setAutoBackupEnabled(autoEnabled === 'true');
      setBackupInterval(interval ? parseInt(interval, 10) : 7);
      setLastBackupDate(lastAuto || lastManual);
    });
  }, [db]));

  const handleThemeCycle = useCallback(() => {
    cycleTheme();
  }, [cycleTheme]);

  const updatePayrollSetting = useCallback(<K extends keyof PayrollSettings>(key: K, value: PayrollSettings[K]) => {
    setPayrollSettings(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'enabled') AsyncStorage.setItem(PAYROLL_ENABLED_KEY, next.enabled ? 'true' : 'false');
      if (key === 'salaryDay') AsyncStorage.setItem(PAYROLL_DAY_KEY, String(next.salaryDay));
      if (key === 'salaryCategoryId') {
        if (next.salaryCategoryId != null) {
          AsyncStorage.setItem(PAYROLL_CATEGORY_KEY, String(next.salaryCategoryId));
        } else {
          AsyncStorage.removeItem(PAYROLL_CATEGORY_KEY);
        }
      }
      return next;
    });
  }, []);

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

        <TouchableOpacity style={styles.item} onPress={() => router.push('/goals' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#EC489920' }]}>
              <Ionicons name="flag-outline" size={20} color="#EC4899" />
            </View>
            <Text style={styles.itemTitle}>Target Menabung</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/reminders' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#F9731620' }]}>
              <Ionicons name="alarm-outline" size={20} color="#F97316" />
            </View>
            <Text style={styles.itemTitle}>Pengingat Tagihan</Text>
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

        <TouchableOpacity style={styles.item} onPress={() => router.push('/annual' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="bar-chart-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.itemTitle}>Laporan Tahunan</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/net-worth' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="wallet-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.itemTitle}>Kekayaan Bersih</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/subscriptions' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="card-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.itemTitle}>Langganan</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => {
          const newVal = !safeToSpendEnabled;
          setSafeToSpendEnabled(newVal);
          AsyncStorage.setItem(SAFE_TO_SPEND_KEY, newVal ? 'true' : 'false');
        }}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#38BDF820' }]}>
              <Ionicons 
                name={safeToSpendEnabled ? 'checkbox' : 'square-outline'} 
                size={20} 
                color="#38BDF8" 
              />
            </View>
            <Text style={styles.itemTitle}>Sisa Budget Harian</Text>
          </View>
          <Text style={styles.itemSub}>{safeToSpendEnabled ? 'Aktif' : 'Nonaktif'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/import' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="cloud-upload-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.itemTitle}>Impor CSV Rekening Koran</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Payroll Period Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Periode Gaji</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => updatePayrollSetting('enabled', !payrollSettings.enabled)}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="cash-outline" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.itemTitle}>Hitung Dashboard per Gaji</Text>
              <Text style={styles.itemSub}>Periode dari gaji terakhir sampai sebelum gaji berikutnya</Text>
            </View>
          </View>
          <Ionicons
            name={payrollSettings.enabled ? 'checkbox' : 'square-outline'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        {payrollSettings.enabled && (
          <View style={styles.payrollConfig}>
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>Tanggal gaji setiap bulan</Text>
              <View style={styles.dayStepper}>
                <TouchableOpacity
                  style={styles.dayButton}
                  onPress={() => updatePayrollSetting('salaryDay', Math.max(1, payrollSettings.salaryDay - 1))}
                >
                  <Ionicons name="remove" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dayValue}>{payrollSettings.salaryDay}</Text>
                <TouchableOpacity
                  style={styles.dayButton}
                  onPress={() => updatePayrollSetting('salaryDay', Math.min(31, payrollSettings.salaryDay + 1))}
                >
                  <Ionicons name="add" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.payrollCategorySection}>
              <Text style={styles.payrollLabel}>Kategori yang dianggap gaji</Text>
              <View style={styles.categoryChips}>
                {incomeCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      payrollSettings.salaryCategoryId === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }
                    ]}
                    onPress={() => updatePayrollSetting('salaryCategoryId', cat.id)}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                    <Text style={[
                      styles.categoryChipText,
                      payrollSettings.salaryCategoryId === cat.id && { color: cat.color, fontWeight: '600' }
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Keamanan</Text>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/lock' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
            </View>
            <Text style={styles.itemTitle}>Kunci Aplikasi</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Tampilan Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tampilan</Text>

        <TouchableOpacity style={styles.item} onPress={handleThemeCycle}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons 
                name={themeName === 'dark' ? 'moon-outline' : themeName === 'light' ? 'sunny-outline' : 'contrast-outline'} 
                size={20} 
                color={theme.colors.primary} 
              />
            </View>
            <Text style={styles.itemTitle}>Tema</Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemSub}>
              {themeName === 'auto' ? 'Auto' : themeName === 'dark' ? 'Gelap' : 'Terang'}
            </Text>
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

      {/* Auto Backup Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backup Otomatis</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            const newVal = !autoBackupEnabled;
            setAutoBackupEnabled(newVal);
            AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, newVal ? 'true' : 'false');
          }}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#38BDF820' }]}>
              <Ionicons name="refresh-circle-outline" size={20} color="#38BDF8" />
            </View>
            <View>
              <Text style={styles.itemTitle}>Backup Otomatis</Text>
              <Text style={styles.itemSub}>
                {lastBackupDate
                  ? `Backup terakhir: ${dayjs(lastBackupDate).locale('id').format('DD MMM YYYY')}`
                  : 'Belum pernah backup otomatis'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={autoBackupEnabled ? 'checkbox' : 'square-outline'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        {autoBackupEnabled && (
          <View style={styles.payrollConfig}>
            <Text style={styles.payrollLabel}>Frekuensi backup</Text>
            <View style={styles.categoryChips}>
              {BACKUP_INTERVALS.map(opt => (
                <TouchableOpacity
                  key={opt.days}
                  style={[
                    styles.categoryChip,
                    backupInterval === opt.days && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                  ]}
                  onPress={() => {
                    setBackupInterval(opt.days);
                    AsyncStorage.setItem(BACKUP_INTERVAL_KEY, String(opt.days));
                  }}
                >
                  <Text style={[
                    styles.categoryChipText,
                    backupInterval === opt.days && { color: theme.colors.primary, fontWeight: '600' }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.itemSub}>
              Backup disimpan ke penyimpanan aplikasi (iOS: otomatis ke iCloud + Files; Android: pilih folder Google Drive sekali saat pertama kali)
            </Text>
          </View>
        )}
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

const makeStyles = (theme: Theme) => StyleSheet.create({
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
  payrollConfig: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  payrollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payrollLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  dayStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dayValue: {
    ...theme.typography.body,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  payrollCategorySection: {
    gap: theme.spacing.sm,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  versionText: { ...theme.typography.bodySmall },
});

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';

import { useTheme, type Theme } from '@/constants/theme';
import { useBook } from '@/constants/books';
import { exportBackup, importBackup, LAST_BACKUP_DATE_KEY } from '@/features/export/backupRestore';
import { AUTO_BACKUP_ENABLED_KEY, BACKUP_INTERVAL_KEY, LAST_AUTO_BACKUP_KEY, BACKUP_INTERVALS } from '@/features/cloud-backup/backupScheduler';
import {
  NOTIF_ENABLED_KEY,
  DAILY_REMINDER_KEY,
  DAILY_REMINDER_TIME_KEY,
  isNotifEnabled,
  isDailyReminderEnabled,
  getDailyReminderTime,
  rescheduleAllReminders,
} from '@/features/notifications/localNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryQueries } from '@/lib/queries';
import { hapticError, hapticLight, hapticSuccess } from '@/utils/haptic';
import { Category, PayrollSettings } from '@/types';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { GameState, loadGameState, getLevelProgress, resetGameState } from '@/features/game/gameStore';
import { ACHIEVEMENTS } from '@/features/game/data';
import {
  GameSettings,
  DEFAULT_SETTINGS,
  DIFFICULTIES,
  ROUND_OPTIONS,
  loadGameSettings,
  saveGameSettings,
  difficultyOf,
} from '@/features/game/gameSettings';

const SAFE_TO_SPEND_KEY = 'safe_to_spend_enabled';
const PAYROLL_ENABLED_KEY = 'payroll_enabled';
const PAYROLL_DAY_KEY = 'payroll_day';
const PAYROLL_CATEGORY_KEY = 'payroll_category_id';

export default function SettingsScreen() {
  const { theme, themeName, cycleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;
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
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState('20:00');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useFocusEffect(useCallback(() => {
    loadGameState().then(setGameState);
    loadGameSettings().then(setGameSettings);
    AsyncStorage.getItem(SAFE_TO_SPEND_KEY).then((val) => {
      setSafeToSpendEnabled(val !== 'false');
    });

    const categoryQueries = new CategoryQueries(db, bookId);
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

    Promise.all([
      isNotifEnabled(),
      isDailyReminderEnabled(),
      getDailyReminderTime(),
    ]).then(([notif, daily, time]) => {
      setNotifEnabled(notif);
      setDailyReminder(daily);
      setDailyReminderTime(`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`);
    });
  }, [db, bookId]));

  const handleThemeCycle = useCallback(() => {
    hapticLight();
    cycleTheme();
  }, [cycleTheme]);

  const shiftReminderTime = useCallback((deltaMinutes: number) => {
    hapticLight();
    setDailyReminderTime((prev) => {
      const [h, m] = prev.split(':').map(Number);
      const total = (h * 60 + m + deltaMinutes + 1440) % 1440;
      const next = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      AsyncStorage.setItem(DAILY_REMINDER_TIME_KEY, next).then(() =>
        rescheduleAllReminders(db).catch(() => {})
      );
      return next;
    });
  }, [db]);

  const updatePayrollSetting = useCallback(<K extends keyof PayrollSettings>(key: K, value: PayrollSettings[K]) => {
    hapticLight();
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

  const updateGameSetting = useCallback(<K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    hapticLight();
    setGameSettings(prev => {
      const next = { ...prev, [key]: value };
      saveGameSettings(next);
      return next;
    });
  }, []);

  const handleResetGame = useCallback(() => {
    Alert.alert(
      'Reset Progres Game?',
      'Semua level, XP, badge, dan skor terbaik akan hilang permanen.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const fresh = await resetGameState();
            setGameState(fresh);
            hapticSuccess();
          },
        },
      ]
    );
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

        <TouchableOpacity style={styles.item} onPress={() => router.push('/books' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="book-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.itemTitle}>Pembukuan</Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemSub}>Ganti / kelola buku</Text>
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
            <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="sync-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.itemTitle}>Transaksi Berulang</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/transfer' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.info + '20' }]}>
              <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.info} />
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
            <View style={[styles.iconBg, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name="download-outline" size={20} color={theme.colors.warning} />
            </View>
            <Text style={styles.itemTitle}>Ekspor Laporan (Excel)</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/annual' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="bar-chart-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.itemTitle}>Laporan Tahunan</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/net-worth' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="wallet-outline" size={20} color={theme.colors.success} />
            </View>
            <Text style={styles.itemTitle}>Kekayaan Bersih</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/subscriptions' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="card-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.itemTitle}>Langganan</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/debts' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#F9731620' }]}>
              <Ionicons name="people-outline" size={20} color="#F97316" />
            </View>
            <Text style={styles.itemTitle}>Utang & Piutang</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/forecast' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.info + '20' }]}>
              <Ionicons name="trending-up-outline" size={20} color={theme.colors.info} />
            </View>
            <Text style={styles.itemTitle}>Proyeksi 30 Hari</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/transactions/calendar' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.itemTitle}>Kalender Transaksi</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => {
          hapticLight();
          const newVal = !safeToSpendEnabled;
          setSafeToSpendEnabled(newVal);
          AsyncStorage.setItem(SAFE_TO_SPEND_KEY, newVal ? 'true' : 'false');
        }}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.info + '20' }]}>
              <Ionicons 
                name={safeToSpendEnabled ? 'checkbox' : 'square-outline'} 
                size={20} 
                color={theme.colors.info} 
              />
            </View>
            <Text style={styles.itemTitle}>Sisa Budget Harian</Text>
          </View>
          <Text style={styles.itemSub}>{safeToSpendEnabled ? 'Aktif' : 'Nonaktif'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/import' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.success} />
            </View>
            <Text style={styles.itemTitle}>Impor CSV Rekening Koran</Text>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Arena Finansial Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Arena Finansial</Text>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/game' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: '#8B5CF620' }]}>
              {gameState ? (
                <Text style={{ fontSize: 20 }}>{getLevelProgress(gameState).current.icon}</Text>
              ) : (
                <Ionicons name="game-controller-outline" size={20} color="#8B5CF6" />
              )}
            </View>
            <View>
              <Text style={styles.itemTitle}>Main Sekarang</Text>
              <Text style={styles.itemSub}>
                {gameState
                  ? `Level ${gameState.level} • ${gameState.unlockedBadges.length}/${ACHIEVEMENTS.length} Badge`
                  : 'Main kuis & survival budget'}
              </Text>
            </View>
          </View>
          <View style={styles.itemRight}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {gameState && (
          <View style={styles.payrollConfig}>
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>Level {gameState.level}</Text>
              <Text style={styles.itemSub}>{gameState.totalXp} XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${getLevelProgress(gameState).progress}%` }]} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{gameState.dailyStreak}</Text>
                <Text style={styles.statLabel}>Hari Streak</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{gameState.maxStreak}</Text>
                <Text style={styles.statLabel}>Streak Kuis</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{gameState.modesPlayed.length}/5</Text>
                <Text style={styles.statLabel}>Mode Dimainkan</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.payrollConfig}>
          <Text style={styles.payrollLabel}>Tingkat Kesulitan</Text>
          <View style={styles.categoryChips}>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.categoryChip,
                  gameSettings.difficulty === d.key && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ]}
                onPress={() => updateGameSetting('difficulty', d.key)}
              >
                <Text style={{ fontSize: 13 }}>{d.icon}</Text>
                <Text style={[
                  styles.categoryChipText,
                  gameSettings.difficulty === d.key && { color: theme.colors.primary, fontWeight: '600' },
                ]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.itemSub}>
            {`${difficultyOf(gameSettings).time} detik/soal • Bonus XP x${difficultyOf(gameSettings).xpMult}`}
          </Text>

          <Text style={[styles.payrollLabel, { marginTop: 4 }]}>Jumlah Soal per Ronde</Text>
          <View style={styles.categoryChips}>
            {ROUND_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.categoryChip,
                  gameSettings.rounds === r && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ]}
                onPress={() => updateGameSetting('rounds', r)}
              >
                <Text style={[
                  styles.categoryChipText,
                  gameSettings.rounds === r && { color: theme.colors.primary, fontWeight: '600' },
                ]}>
                  {r} soal
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.item} onPress={() => updateGameSetting('haptics', !gameSettings.haptics)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name={gameSettings.haptics ? 'pulse' : 'pulse-outline'} size={20} color={theme.colors.warning} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Getaran Feedback</Text>
              <Text style={styles.itemSub}>Getar saat jawaban benar / salah</Text>
            </View>
          </View>
          <Ionicons
            name={gameSettings.haptics ? 'checkbox' : 'square-outline'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => updateGameSetting('showTips', !gameSettings.showTips)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.info + '20' }]}>
              <Ionicons name="bulb-outline" size={20} color={theme.colors.info} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Tampilkan Tips Edukasi</Text>
              <Text style={styles.itemSub}>Penjelasan setelah menjawab soal</Text>
            </View>
          </View>
          <Ionicons
            name={gameSettings.showTips ? 'checkbox' : 'square-outline'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={handleResetGame}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.danger + '20' }]}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </View>
            <View>
              <Text style={[styles.itemTitle, { color: theme.colors.danger }]}>Reset Progres Game</Text>
              <Text style={styles.itemSub}>Hapus level, XP, dan semua badge</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
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
            <View style={[styles.iconBg, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.success} />
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

      {/* Notification Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifikasi</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={async () => {
            hapticLight();
            const newVal = !notifEnabled;
            setNotifEnabled(newVal);
            await AsyncStorage.setItem(NOTIF_ENABLED_KEY, newVal ? 'true' : 'false');
            if (!newVal) {
              setDailyReminder(false);
              await AsyncStorage.removeItem(DAILY_REMINDER_KEY);
            }
            // Apply immediately instead of waiting for the next app launch.
            rescheduleAllReminders(db).catch(() => {});
          }}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name={notifEnabled ? 'notifications' : 'notifications-off-outline'} size={20} color={theme.colors.warning} />
            </View>
            <Text style={styles.itemTitle}>Notifikasi</Text>
          </View>
          <Text style={styles.itemSub}>{notifEnabled ? 'Aktif' : 'Nonaktif'}</Text>
        </TouchableOpacity>

        {notifEnabled && (
          <>
            <TouchableOpacity
              style={styles.item}
              onPress={async () => {
                hapticLight();
                const newVal = !dailyReminder;
                setDailyReminder(newVal);
                await AsyncStorage.setItem(DAILY_REMINDER_KEY, newVal ? 'true' : 'false');
                rescheduleAllReminders(db).catch(() => {});
              }}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Ionicons name={dailyReminder ? 'checkbox' : 'square-outline'} size={20} color={theme.colors.accent} />
                </View>
                <Text style={styles.itemTitle}>Pengingat Harian</Text>
              </View>
              <Text style={styles.itemSub}>{dailyReminder ? 'Aktif' : 'Nonaktif'}</Text>
            </TouchableOpacity>

            {dailyReminder && (
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Ionicons name="time-outline" size={20} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.itemTitle}>Jam pengingat</Text>
                </View>
                <View style={styles.dayStepper}>
                  <TouchableOpacity style={styles.dayButton} onPress={() => shiftReminderTime(-30)}>
                    <Ionicons name="remove" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.dayValue, { minWidth: 52 }]}>{dailyReminderTime}</Text>
                  <TouchableOpacity style={styles.dayButton} onPress={() => shiftReminderTime(30)}>
                    <Ionicons name="add" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Keamanan</Text>

        <TouchableOpacity style={styles.item} onPress={() => router.push('/lock' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.accent} />
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
          try { await exportBackup(db); hapticSuccess(); } catch (e: any) { if (e?.message !== 'Pembatalan') { hapticError(); Alert.alert('Error', 'Gagal backup'); } }
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
            hapticSuccess();
            Alert.alert('Restore Berhasil', msg);
          } catch (e: any) {
            if (e?.message !== 'Pembatalan') { hapticError(); Alert.alert('Error', e?.message || 'Gagal restore'); }
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

        <TouchableOpacity style={styles.item} onPress={() => router.push('/cloud-backup' as any)}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.info + '20' }]}>
              <Ionicons name="cloud-outline" size={20} color={theme.colors.info} />
            </View>
            <View>
              <Text style={styles.itemTitle}>Backup Cloud</Text>
              <Text style={styles.itemSub}>Simpan ke cloud via username & password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Auto Backup Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backup Otomatis</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            hapticLight();
            const newVal = !autoBackupEnabled;
            setAutoBackupEnabled(newVal);
            AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, newVal ? 'true' : 'false');
          }}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.info + '20' }]}>
              <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.info} />
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
                    hapticLight();
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
  section: { marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
  sectionTitle: {
    ...theme.typography.bodySmall, marginBottom: theme.spacing.md, marginLeft: theme.spacing.sm,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700',
    color: theme.colors.primary,
  },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surfaceCard, padding: theme.spacing.lg,
    borderRadius: theme.radius.xl, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBg: { width: 44, height: 44, borderRadius: theme.radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  itemTitle: { ...theme.typography.body, fontWeight: '700', fontSize: 15 },
  itemSub: { ...theme.typography.caption, color: theme.colors.textMuted },
  payrollConfig: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payrollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payrollLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  dayStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
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
    fontWeight: '700',
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  versionText: { ...theme.typography.bodySmall, color: theme.colors.textMuted },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: theme.colors.track, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: theme.colors.primary },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  statValue: { ...theme.typography.body, fontWeight: '800', fontSize: 16 },
  statLabel: { ...theme.typography.caption, fontSize: 10, color: theme.colors.textMuted },
});


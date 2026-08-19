import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

import { useTheme, type Theme } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signIn, signUp, signOut, getSession, usernameFromSession } from '@/features/cloud-backup/supabaseAuth';
import {
  uploadBackup, listBackups, restoreBackup, deleteBackup,
  CLOUD_BACKUP_ENABLED_KEY, type CloudBackupItem,
} from '@/features/cloud-backup/supabaseBackup';

const formatSize = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const parseStamp = (name: string) => {
  const m = name.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  const d = dayjs(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
  return d.isValid() ? d : null;
};

export default function CloudBackupScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();

  const [username, setUsername] = useState('');
  const [account, setAccount] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [items, setItems] = useState<CloudBackupItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoCloud, setAutoCloud] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      const name = usernameFromSession(session);
      setAccount(name);
      setItems(name ? await listBackups() : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    AsyncStorage.getItem(CLOUD_BACKUP_ENABLED_KEY).then(v => setAutoCloud(v === 'true'));
    refresh();
  }, [refresh]));

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); }
    catch (e: any) { Alert.alert('Error', e?.message || 'Terjadi kesalahan'); }
    finally { setBusy(null); }
  };

  const handleAuth = (mode: 'in' | 'up') => run(mode, async () => {
    if (mode === 'up') {
      const session = await signUp(username, password);
      if (!session) {
        Alert.alert('Cek Konfigurasi', 'Akun dibuat tapi sesi kosong. Matikan "Confirm email" di dashboard Supabase.');
        return;
      }
      Alert.alert('Berhasil', 'Akun backup berhasil dibuat.');
    } else {
      await signIn(username, password);
    }
    setPassword('');
    await refresh();
  });

  const handleBackup = () => run('backup', async () => {
    await uploadBackup(db);
    await refresh();
    Alert.alert('Berhasil', 'Data berhasil diunggah ke cloud.');
  });

  const handleRestore = (item: CloudBackupItem) => {
    Alert.alert(
      'Restore Data',
      'Semua data di perangkat ini akan DIGANTI dengan data dari backup. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Restore', style: 'destructive',
          onPress: () => run(item.path, async () => {
            const msg = await restoreBackup(db, item.path);
            Alert.alert('Restore Berhasil', msg);
          }),
        },
      ]
    );
  };

  const handleDelete = (item: CloudBackupItem) => {
    Alert.alert('Hapus Backup', 'Hapus backup ini dari cloud?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: () => run(item.path, async () => {
          await deleteBackup(item.path);
          await refresh();
        }),
      },
    ]);
  };

  const handleSignOut = () => run('out', async () => {
    await signOut();
    setAccount(null);
    setItems([]);
  });

  const toggleAutoCloud = () => {
    const next = !autoCloud;
    setAutoCloud(next);
    AsyncStorage.setItem(CLOUD_BACKUP_ENABLED_KEY, next ? 'true' : 'false');
  };

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Supabase belum dikonfigurasi</Text>
        <Text style={styles.emptyText}>
          Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY pada file .env, lalu jalankan ulang aplikasi.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!account) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Ionicons name="cloud-outline" size={40} color={theme.colors.primary} />
          <Text style={styles.title}>Backup Cloud</Text>
          <Text style={styles.subtitle}>
            Masuk dengan username dan password untuk menyimpan data ke cloud.
          </Text>
        </View>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="minimal 6 karakter"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={() => handleAuth('in')}
          disabled={!!busy}
        >
          <Text style={styles.btnText}>{busy === 'in' ? 'Memproses...' : 'Masuk'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnOutline, busy && styles.btnDisabled]}
          onPress={() => handleAuth('up')}
          disabled={!!busy}
        >
          <Text style={styles.btnOutlineText}>{busy === 'up' ? 'Memproses...' : 'Daftar Akun Baru'}</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Password tidak dapat direset karena akun tidak memakai email. Simpan password dengan aman.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <View style={styles.accountRow}>
        <View style={styles.itemLeft}>
          <View style={[styles.icon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.itemName}>{account}</Text>
            <Text style={styles.itemSub}>Tersambung ke cloud</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut} disabled={!!busy}>
          <Text style={styles.signOut}>{busy === 'out' ? '...' : 'Keluar'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={handleBackup}
        disabled={!!busy}
      >
        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.textOnPrimary} />
        <Text style={styles.btnText}>{busy === 'backup' ? 'Mengunggah...' : 'Backup Sekarang'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.toggleRow} onPress={toggleAutoCloud}>
        <View style={styles.itemLeft}>
          <View style={[styles.icon, { backgroundColor: theme.colors.info + '20' }]}>
            <Ionicons name="sync-outline" size={20} color={theme.colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>Unggah Otomatis</Text>
            <Text style={styles.itemSub}>Ikut jadwal Backup Otomatis di Pengaturan</Text>
          </View>
        </View>
        <Ionicons
          name={autoCloud ? 'checkbox' : 'square-outline'}
          size={24}
          color={theme.colors.primary}
        />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Backup Tersimpan ({items.length})</Text>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada backup di cloud.</Text>
      ) : (
        items.map(item => {
          const stamp = parseStamp(item.name) ?? (item.createdAt ? dayjs(item.createdAt) : null);
          return (
            <View key={item.path} style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.icon, { backgroundColor: theme.colors.success + '20' }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {stamp ? stamp.locale('id').format('DD MMM YYYY, HH:mm') : item.name}
                  </Text>
                  <Text style={styles.itemSub}>{formatSize(item.size)}</Text>
                </View>
              </View>
              {busy === item.path ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleRestore(item)} disabled={!!busy} hitSlop={8}>
                    <Ionicons name="cloud-download-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} disabled={!!busy} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      <Text style={styles.note}>
        Maksimal 10 backup terbaru disimpan. Backup lama otomatis dihapus.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  center: {
    flex: 1, backgroundColor: theme.colors.background,
    justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg,
  },
  hero: { alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { ...theme.typography.h2, marginTop: theme.spacing.sm },
  subtitle: { ...theme.typography.bodySmall, textAlign: 'center', marginTop: theme.spacing.xs },
  label: { ...theme.typography.bodySmall, marginBottom: theme.spacing.xs, marginTop: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 2,
    ...theme.typography.body,
  },
  btn: {
    flexDirection: 'row', gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary, borderRadius: theme.radius.md,
    padding: theme.spacing.md, alignItems: 'center', justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  btnText: { ...theme.typography.body, color: theme.colors.textOnPrimary, fontWeight: '600' },
  btnOutline: {
    borderRadius: theme.radius.md, padding: theme.spacing.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border, marginTop: theme.spacing.sm,
  },
  btnOutlineText: { ...theme.typography.body, color: theme.colors.primary, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  note: { ...theme.typography.caption, marginTop: theme.spacing.md, textAlign: 'center' },
  accountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md,
  },
  itemName: { ...theme.typography.body, fontWeight: '500', marginBottom: 2 },
  itemSub: { ...theme.typography.caption },
  actions: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  signOut: { ...theme.typography.body, color: theme.colors.danger, fontWeight: '600' },
  sectionTitle: { ...theme.typography.h3, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  emptyTitle: { ...theme.typography.h3, marginTop: theme.spacing.md, textAlign: 'center' },
  emptyText: { ...theme.typography.bodySmall, textAlign: 'center', marginTop: theme.spacing.xs },
});

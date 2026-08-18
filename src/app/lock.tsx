import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getStoredPin, isBiometricEnabled, clearPinLock, hashPin } from '@/lib/lockStorage';
import { BIOMETRIC_KEY, PIN_SECURE_KEY } from '@/lib/lockStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export { getStoredPin, isBiometricEnabled, clearPinLock };

export default function LockSettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometric, setBiometric] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    const pin = await getStoredPin();
    setHasPin(!!pin);
    setBiometric(await isBiometricEnabled());
  }, []);

  React.useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSetPin = async () => {
    if (newPin.length !== 4) { Alert.alert('Error', 'PIN harus 4 digit'); return; }
    if (newPin !== confirmPin) { Alert.alert('Error', 'PIN tidak cocok'); return; }

    if (hasPin) {
      const stored = await getStoredPin();
      const currentHash = await hashPin(currentPin);
      if (currentHash !== stored) { Alert.alert('Error', 'PIN saat ini salah'); return; }
    }

    try {
      setLoading(true);
      const newHash = await hashPin(newPin);
      await SecureStore.setItemAsync(PIN_SECURE_KEY, newHash);
      await AsyncStorage.setItem(BIOMETRIC_KEY, biometric ? 'true' : 'false');
      Alert.alert('Berhasil', 'PIN berhasil disimpan.');
      setHasPin(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch { Alert.alert('Error', 'Gagal menyimpan PIN'); }
    finally { setLoading(false); }
  };

  const handleRemovePin = async () => {
    Alert.alert('Hapus PIN', 'Yakin ingin menghapus PIN kunci aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        await clearPinLock();
        setHasPin(false);
        setBiometric(false);
        Alert.alert('Berhasil', 'PIN kunci aplikasi dihapus.');
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed-outline" size={48} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>Kunci Aplikasi</Text>
      <Text style={styles.subtitle}>
        {hasPin ? 'Aplikasi terkunci. Ubah atau hapus PIN di sini.' : 'Atur PIN untuk mengunci aplikasi.'}
      </Text>

      <View style={styles.statusCard}>
        <Ionicons name={hasPin ? 'lock-closed' : 'lock-open'} size={20} color={hasPin ? theme.colors.income : theme.colors.textSecondary} />
        <Text style={styles.statusText}>
          Status: {hasPin ? 'Aktif' : 'Nonaktif'}
        </Text>
      </View>

      {hasPin && (
        <Input
          label="PIN Saat Ini"
          placeholder="Masukkan PIN saat ini"
          value={currentPin}
          onChangeText={(t) => setCurrentPin(t.replace(/\D/g, '').slice(0, 4))}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={4}
        />
      )}

      <Input
        label={hasPin ? 'PIN Baru' : 'PIN Baru (4 digit)'}
        placeholder="Masukkan PIN 4 digit"
        value={newPin}
        onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
      />

      <Input
        label="Konfirmasi PIN"
        placeholder="Masukkan ulang PIN"
        value={confirmPin}
        onChangeText={(t) => setConfirmPin(t.replace(/\D/g, '').slice(0, 4))}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
      />

      <TouchableOpacity style={styles.biometricRow} onPress={() => setBiometric(!biometric)}>
        <Ionicons name="finger-print-outline" size={24} color={theme.colors.textSecondary} />
        <Text style={styles.biometricText}>Gunakan Biometric (Face ID / Fingerprint)</Text>
        <Ionicons
          name={biometric ? 'checkbox' : 'square-outline'}
          size={22}
          color={biometric ? theme.colors.primary : theme.colors.textSecondary}
        />
      </TouchableOpacity>

      <Button
        title={hasPin ? 'Ubah PIN' : 'Simpan PIN'}
        onPress={handleSetPin}
        disabled={newPin.length !== 4 || newPin !== confirmPin || (hasPin && !currentPin)}
        loading={loading}
        fullWidth
      />

      {hasPin && (
        <Button
          title="Hapus PIN"
          variant="danger"
          onPress={handleRemovePin}
          style={{ marginTop: theme.spacing.md }}
          fullWidth
        />
      )}
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  iconContainer: { alignItems: 'center', marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  title: { ...theme.typography.h2, textAlign: 'center', marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xl },
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border },
  statusText: { ...theme.typography.body, fontWeight: '600' },
  biometricRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xl, paddingVertical: theme.spacing.sm },
  biometricText: { ...theme.typography.body, flex: 1, color: theme.colors.textSecondary },
});

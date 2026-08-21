import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, type Theme } from '@/constants/theme';
import { getStoredPin, isBiometricEnabled, hashPin } from '@/lib/lockStorage';
import { markUnlocked } from '@/lib/unlockGate';

const PIN_LENGTH = 4;

export default function LockEntryScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [correctHash, setCorrectHash] = useState<string | null>(null);
  const [useBiometric, setUseBiometric] = useState(false);
  const shakeRef = useRef(false);

  useEffect(() => {
    (async () => {
      setCorrectHash(await getStoredPin());
      setUseBiometric(await isBiometricEnabled());
    })();
  }, []);

  const handlePress = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    setError('');
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    if (pin.length === 0) return;
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const verifyPin = async (entered: string) => {
    const enteredHash = await hashPin(entered);

    if (enteredHash === correctHash) {
      markUnlocked();
      router.replace('/(tabs)');
    } else {
      shakeRef.current = true;
      setError('PIN salah');
      setPin('');
      setTimeout(() => { shakeRef.current = false; }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
        <Text style={styles.title}>Masukkan PIN</Text>
        <Text style={styles.subtitle}>Aplikasi terkunci</Text>
      </View>

      <View style={[styles.dotsContainer, shakeRef.current && styles.shake]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ height: 20 }} />}

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <TouchableOpacity key={d} style={styles.key} onPress={() => handlePress(String(d))}>
            <Text style={styles.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.key} onPress={async () => {
          if (useBiometric) {
            try {
              const { authenticateAsync } = await import('expo-local-authentication');
              const result = await authenticateAsync({ promptMessage: 'Buka FinTrack' });
               if (result.success) {
                 markUnlocked();
                 router.replace('/(tabs)');
               }
            } catch {}
          }
        }}>
          <Ionicons name="finger-print-outline" size={28} color={useBiometric ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity key={0} style={styles.key} onPress={() => handlePress('0')}>
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.key} onPress={handleDelete}>
          <Ionicons name="backspace-outline" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { ...theme.typography.h2, marginTop: theme.spacing.md },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary },
  dotsContainer: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  shake: {},
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
  dotFilled: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  errorText: { ...theme.typography.bodySmall, color: theme.colors.danger, marginBottom: 4 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 270, gap: 12 },
  key: { width: 82, height: 66, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  keyText: { ...theme.typography.h2 },
});

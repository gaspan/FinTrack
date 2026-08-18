import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

export const PIN_SECURE_KEY = 'app_pin_hash_v2';
export const PIN_LEGACY_KEY = 'app_pin_hash';
export const BIOMETRIC_KEY = 'app_biometric_enabled';
const PIN_SALT = 'fintrack_pin_salt_v1';

export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    PIN_SALT + pin
  );
}

async function migrateFromAsyncStorage(): Promise<void> {
  try {
    const legacyHash = await AsyncStorage.getItem(PIN_LEGACY_KEY);
    if (legacyHash) {
      await AsyncStorage.removeItem(PIN_LEGACY_KEY);
    }
  } catch {}
}

export async function getStoredPin(): Promise<string | null> {
  try {
    await migrateFromAsyncStorage();
    return await SecureStore.getItemAsync(PIN_SECURE_KEY);
  } catch { return null; }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(BIOMETRIC_KEY)) === 'true'; }
  catch { return false; }
}

export async function clearPinLock() {
  try {
    await SecureStore.deleteItemAsync(PIN_SECURE_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_KEY);
  } catch {}
}

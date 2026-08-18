import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOT_KEY = 'last_boot_step';

export async function bootCheckpoint(step: string): Promise<void> {
  try { await AsyncStorage.setItem(BOOT_KEY, step); } catch {}
}

export async function getLastBootStep(): Promise<string | null> {
  try { return await AsyncStorage.getItem(BOOT_KEY); } catch { return null; }
}

export async function markBootOk(): Promise<void> {
  try { await AsyncStorage.setItem(BOOT_KEY, 'ok'); } catch {}
}

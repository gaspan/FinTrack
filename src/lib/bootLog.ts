import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOT_KEY = 'last_boot_step';
const BOOT_DIAG_ACK_KEY = 'last_boot_diag_acked';

export async function bootCheckpoint(step: string): Promise<void> {
  try { await AsyncStorage.setItem(BOOT_KEY, step); } catch {}
}

export async function getLastBootStep(): Promise<string | null> {
  try { return await AsyncStorage.getItem(BOOT_KEY); } catch { return null; }
}

export async function markBootOk(): Promise<void> {
  try { await AsyncStorage.setItem(BOOT_KEY, 'ok'); } catch {}
}

// The step log is only cleared to 'ok' once the tabs engine finishes, which
// never happens while the app is sitting on the lock screen. Without an
// acknowledgement the diagnostic alert would fire on every cold start from a
// stale step. Show it at most once per distinct failing step instead.
export async function shouldShowBootDiagnostic(): Promise<string | null> {
  try {
    const last = await AsyncStorage.getItem(BOOT_KEY);
    if (!last || last === 'ok' || last === 'module_eval') return null;
    const acked = await AsyncStorage.getItem(BOOT_DIAG_ACK_KEY);
    return acked === last ? null : last;
  } catch { return null; }
}

export async function ackBootDiagnostic(step: string): Promise<void> {
  try { await AsyncStorage.setItem(BOOT_DIAG_ACK_KEY, step); } catch {}
}

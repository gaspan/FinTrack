import AsyncStorage from '@react-native-async-storage/async-storage';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameSettings {
  difficulty: Difficulty;
  rounds: number;
  haptics: boolean;
  showTips: boolean;
  survivalTier: number; // 1-5
}

export const GAME_SETTINGS_KEY = 'arena_game_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  rounds: 10,
  haptics: true,
  showTips: true,
  survivalTier: 2,
};

export const DIFFICULTIES: { key: Difficulty; label: string; time: number; xpMult: number; icon: string }[] = [
  { key: 'easy', label: 'Santai', time: 25, xpMult: 0.75, icon: '🌿' },
  { key: 'normal', label: 'Normal', time: 15, xpMult: 1, icon: '⚡' },
  { key: 'hard', label: 'Sultan', time: 8, xpMult: 1.5, icon: '🔥' },
];

export const ROUND_OPTIONS = [5, 10, 15, 20] as const;

export function difficultyOf(s: GameSettings) {
  return DIFFICULTIES.find((d) => d.key === s.difficulty) ?? DIFFICULTIES[1];
}

export async function loadGameSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem(GAME_SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveGameSettings(s: GameSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}


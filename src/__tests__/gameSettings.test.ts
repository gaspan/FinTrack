import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  DIFFICULTIES,
  GAME_SETTINGS_KEY,
  ROUND_OPTIONS,
  difficultyOf,
  loadGameSettings,
  saveGameSettings,
} from '@/features/game/gameSettings';
import { resetGameState } from '@/features/game/gameStore';

describe('gameSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('returns defaults when nothing is stored', async () => {
    const s = await loadGameSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values over defaults', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ difficulty: 'hard', rounds: 5 })
    );
    const s = await loadGameSettings();
    expect(s.difficulty).toBe('hard');
    expect(s.rounds).toBe(5);
    expect(s.haptics).toBe(DEFAULT_SETTINGS.haptics);
    expect(s.showTips).toBe(DEFAULT_SETTINGS.showTips);
  });

  it('falls back to defaults on corrupt JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{not json');
    const s = await loadGameSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('persists settings as JSON', async () => {
    const next = { ...DEFAULT_SETTINGS, difficulty: 'easy' as const, rounds: 15 };
    await saveGameSettings(next);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(GAME_SETTINGS_KEY, JSON.stringify(next));
  });
});

describe('difficultyOf', () => {
  it('maps each difficulty to its tuning', () => {
    for (const d of DIFFICULTIES) {
      const got = difficultyOf({ ...DEFAULT_SETTINGS, difficulty: d.key });
      expect(got).toEqual(d);
    }
  });

  it('falls back to normal for unknown difficulty', () => {
    const got = difficultyOf({ ...DEFAULT_SETTINGS, difficulty: 'nope' as any });
    expect(got.key).toBe('normal');
  });

  it('harder difficulty has less time and more XP', () => {
    expect(difficultyOf({ ...DEFAULT_SETTINGS, difficulty: 'hard' }).time)
      .toBeLessThan(difficultyOf({ ...DEFAULT_SETTINGS, difficulty: 'easy' }).time);
    expect(difficultyOf({ ...DEFAULT_SETTINGS, difficulty: 'hard' }).xpMult)
      .toBeGreaterThan(difficultyOf({ ...DEFAULT_SETTINGS, difficulty: 'easy' }).xpMult);
  });

  it('round options are sane', () => {
    expect(ROUND_OPTIONS.every((r) => r > 0 && r % 5 === 0)).toBe(true);
  });
});

describe('resetGameState', () => {
  it('writes a fresh state with no progress', async () => {
    const fresh = await resetGameState();
    expect(fresh.totalXp).toBe(0);
    expect(fresh.level).toBe(1);
    expect(fresh.unlockedBadges).toEqual([]);
    expect(fresh.modesPlayed).toEqual([]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'arena_game_state_v1',
      JSON.stringify(fresh)
    );
  });
});

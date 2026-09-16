import AsyncStorage from '@react-native-async-storage/async-storage';
import { Level, LEVELS, Achievement, ACHIEVEMENTS, BEST_KEYS } from './data';
import dayjs from 'dayjs';

export interface GameState {
  totalXp: number;
  level: number;
  quizCount: number;
  quizBest: number;
  maxStreak: number;
  priceCount: number;
  priceBest: number;
  pricePerfect: boolean;
  survivalCount: number;
  survivalBest: number;
  survivalTierBest: Record<number, number>; // best score per tier
  survivalMaxTier: number; // highest tier unlocked (progressive)
  frugalSurvival: boolean; // survived with >=80% salary
  dataCount: number;
  dataBest: number;
  dataPerfect: boolean;
  modesPlayed: string[];
  unlockedBadges: string[];
  lastPlayDate: string | null;
  dailyStreak: number;
}

const GAME_STATE_KEY = 'arena_game_state_v1';

const DEFAULT_STATE: GameState = {
  totalXp: 0,
  level: 1,
  quizCount: 0,
  quizBest: 0,
  maxStreak: 0,
  priceCount: 0,
  priceBest: 0,
  pricePerfect: false,
  survivalCount: 0,
  survivalBest: 0,
  survivalTierBest: {},
  survivalMaxTier: 1, // start unlocked at tier 1
  frugalSurvival: false,
  dataCount: 0,
  dataBest: 0,
  dataPerfect: false,
  modesPlayed: [],
  unlockedBadges: [],
  lastPlayDate: null,
  dailyStreak: 0,
};

// Migrate old best scores to new state
async function migrateOldState(state: GameState): Promise<GameState> {
  const [q, p, s] = await Promise.all([
    AsyncStorage.getItem(BEST_KEYS.quiz),
    AsyncStorage.getItem(BEST_KEYS.price),
    AsyncStorage.getItem(BEST_KEYS.survival),
  ]);
  
  if (q || p || s) {
    if (q) {
      state.quizBest = Math.max(state.quizBest, Number(q));
      if (!state.modesPlayed.includes('quiz')) state.modesPlayed.push('quiz');
      state.quizCount = Math.max(1, state.quizCount);
    }
    if (p) {
      state.priceBest = Math.max(state.priceBest, Number(p));
      if (!state.modesPlayed.includes('price')) state.modesPlayed.push('price');
      state.priceCount = Math.max(1, state.priceCount);
    }
    if (s) {
      state.survivalBest = Math.max(state.survivalBest, Number(s));
      if (!state.modesPlayed.includes('survival')) state.modesPlayed.push('survival');
      state.survivalCount = Math.max(1, state.survivalCount);
    }
    // Convert old bests roughly to XP so returning players don't start at level 1
    const migratedXp = (state.quizBest + state.priceBest) + (state.survivalBest > 0 ? 500 : 0);
    if (migratedXp > state.totalXp) {
      state.totalXp = migratedXp;
    }
    
    // Clear old keys to avoid double migration
    await AsyncStorage.multiRemove([BEST_KEYS.quiz, BEST_KEYS.price, BEST_KEYS.survival]);
  }
  return state;
}

export async function loadGameState(): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(GAME_STATE_KEY);
    let state = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
    state = await migrateOldState(state);
    
    // Handle daily streak
    const today = dayjs().format('YYYY-MM-DD');
    if (state.lastPlayDate) {
      const lastPlay = dayjs(state.lastPlayDate);
      const diff = dayjs(today).diff(lastPlay, 'day');
      if (diff === 1) {
        state.dailyStreak += 1;
      } else if (diff > 1) {
        state.dailyStreak = 1;
      }
    } else {
      state.dailyStreak = 1;
    }
    state.lastPlayDate = today;
    
    // Auto calculate level based on XP in case it was out of sync
    state.level = calculateLevel(state.totalXp);
    
    return state;
  } catch (e) {
    console.error('Error loading game state', e);
    return DEFAULT_STATE;
  }
}

export async function saveGameState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving game state', e);
  }
}

export async function resetGameState(): Promise<GameState> {
  const fresh = { ...DEFAULT_STATE, modesPlayed: [], unlockedBadges: [] };
  await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function calculateLevel(xp: number): number {
  let currentLevel = 1;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) {
      currentLevel = l.level;
    } else {
      break;
    }
  }
  return currentLevel;
}

export function getLevelProgress(state: GameState): { current: Level; next: Level | null; progress: number } {
  const current = LEVELS.find(l => l.level === state.level) || LEVELS[0];
  const next = LEVELS.find(l => l.level === state.level + 1) || null;
  
  if (!next) return { current, next, progress: 100 }; // Max level
  
  const xpIntoLevel = state.totalXp - current.xpRequired;
  const xpNeededForNext = next.xpRequired - current.xpRequired;
  const progress = Math.min(100, Math.max(0, (xpIntoLevel / xpNeededForNext) * 100));
  
  return { current, next, progress };
}

// Evaluate conditions securely (avoid eval)
function evaluateCondition(cond: string, state: GameState): boolean {
  if (cond.includes('quiz_count >= 1')) return state.quizCount >= 1;
  if (cond.includes('quiz_best >=')) return state.quizBest >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('price_best >=')) return state.priceBest >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('survival_best >=')) return state.survivalBest >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('max_streak >=')) return state.maxStreak >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('price_perfect == true')) return state.pricePerfect === true;
  if (cond.includes('modes_played >=')) return state.modesPlayed.length >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('level >=')) return state.level >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('total_xp >=')) return state.totalXp >= parseInt(cond.split('>=')[1].trim());
  if (cond.includes('data_count >= 1')) return state.dataCount >= 1;
  if (cond.includes('data_perfect == true')) return state.dataPerfect === true;
  return false;
}

export function checkAchievements(state: GameState): { newState: GameState; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  const newState = { ...state };
  
  for (const ach of ACHIEVEMENTS) {
    if (!newState.unlockedBadges.includes(ach.id)) {
      // Need a way to map conditions. Since we defined them as strings in `data.ts`, 
      // let's parse them or evaluate them safely.
      // We stored conditions in a comment in the plan, but in data.ts we didn't store the condition string!
      // Let's hardcode the checks based on id to be safe and type-friendly.
      let unlocked = false;
      switch(ach.id) {
        case 'first_quiz': unlocked = state.quizCount >= 1; break;
        case 'quiz_master': unlocked = state.quizBest >= 1000; break;
        case 'price_hawk': unlocked = state.priceBest >= 1000; break;
        case 'survivor': unlocked = state.survivalBest >= 2000000; break;
        case 'streak_5': unlocked = state.maxStreak >= 5; break;
        case 'perfect_price': unlocked = state.pricePerfect === true; break;
        case 'all_modes': unlocked = state.modesPlayed.length >= 4; break;
        case 'level_5': unlocked = state.level >= 5; break;
        case 'total_1000': unlocked = state.totalXp >= 1000; break;
        case 'data_challenge': unlocked = state.dataCount >= 1; break;
        case 'data_perfect': unlocked = state.dataPerfect === true; break;
        // New survival tier achievements
        case 'survival_tier3': unlocked = (state.survivalTierBest[3] ?? 0) > 0; break;
        case 'survival_tier5': unlocked = (state.survivalTierBest[5] ?? 0) > 0; break;
        case 'survival_frugal': unlocked = state.frugalSurvival === true; break;
      }
      
      if (unlocked) {
        newState.unlockedBadges.push(ach.id);
        newlyUnlocked.push(ach);
      }
    }
  }
  
  return { newState, newlyUnlocked };
}

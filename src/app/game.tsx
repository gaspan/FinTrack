import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext, SQLiteDatabase } from 'expo-sqlite';
import { useBook } from '@/constants/books';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/utils/format';
import { hapticError, hapticLight, hapticSuccess } from '@/utils/haptic';
import { PRICE_ITEMS, QUIZ_QUESTIONS, SURVIVAL_EVENTS, SURVIVAL_TIERS, SurvivalTier, rankFor, shuffle, ACHIEVEMENTS, Achievement, SHOP_ITEMS } from '@/features/game/data';
import { LIFE_STAGES, JOURNEY_BACKGROUNDS, JOURNEY_ENDINGS, JourneyBackground, JourneyEnding, JourneyEvent, JourneyChoice, endingFor, scoreJourney, rankOfEnding, JOURNEY_RUN_LENGTH, pickJourneyRun, WISE_POIN_THRESHOLD, comboBonus, pointsFor } from '@/features/game/dataJourney';
import { GameState, loadGameState, saveGameState, checkAchievements, getLevelProgress } from '@/features/game/gameStore';
import { generateDataQuestions, DataQuestion } from '@/features/game/dataChallenge';
import { GameSettings, DEFAULT_SETTINGS, loadGameSettings, saveGameSettings, difficultyOf } from '@/features/game/gameSettings';
import { BUDGET_PROFILES, getRandomBudgetProfile, calculateBudgetScore, getBudgetFeedback } from '@/features/game/dataBudget';
import { getDailyChallenge, DailyChallenge } from '@/features/game/dataDaily';
import Slider from '@react-native-community/slider';
import dayjs from 'dayjs';
import { ADVENTURE_EPISODES, AdventureEpisode } from '@/features/game/dataAdventure';
import { LinearGradient } from 'expo-linear-gradient';

type Mode = 'menu' | 'quiz' | 'price' | 'survival-select' | 'survival' | 'data' | 'journey' | 'daily' | 'budget' | 'stats' | 'shop' | 'adventure';

export default function GamePage() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  const [mode, setMode] = useState<Mode>('menu');
  const [state, setState] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [newBadges, setNewBadges] = useState<Achievement[]>([]);
  const [settingsReady, setSettingsReady] = useState(false);

  useFocusEffect(useCallback(() => {
    loadGameSettings().then((s) => { setSettings(s); setSettingsReady(true); });
    loadGameState().then(setState);
  }, []));

  const handleGameEnd = useCallback(async (mode: Mode, score: number, isPerfect: boolean, streak = 0, survivalTierNum?: number, survivalSalary?: number, journeyEndingId?: string, journeyNetWorth?: number) => {
    if (!state) return;
    
    // XP Calculation scaled by difficulty
    let xpMult = difficultyOf(settings).xpMult;
    // For survival, use tier-specific XP multiplier
    if (mode === 'survival' && survivalTierNum) {
      const tierDef = SURVIVAL_TIERS.find(t => t.tier === survivalTierNum);
      if (tierDef) xpMult = tierDef.xpMult;
    }
    const xpEarned = Math.floor(score * 0.5 * xpMult);
    
    const nextState = { ...state };
    nextState.totalXp += xpEarned;
    if (streak > nextState.maxStreak) nextState.maxStreak = streak;
    const modeKey = mode === 'survival-select' ? 'survival' : mode;
    if (!nextState.modesPlayed.includes(modeKey)) nextState.modesPlayed.push(modeKey);
    
    if (mode === 'quiz') {
      nextState.quizCount += 1;
      nextState.quizBest = Math.max(state.quizBest, score);
    } else if (mode === 'price') {
      nextState.priceCount += 1;
      nextState.priceBest = Math.max(state.priceBest, score);
      if (isPerfect) nextState.pricePerfect = true;
    } else if (mode === 'survival') {
      nextState.survivalCount += 1;
      nextState.survivalBest = Math.max(state.survivalBest, score);
      
      // Track tier-specific best
      if (survivalTierNum) {
        const tierBests = { ...nextState.survivalTierBest };
        tierBests[survivalTierNum] = Math.max(tierBests[survivalTierNum] ?? 0, score);
        nextState.survivalTierBest = tierBests;
        
        // Progressive unlock: survive (score > 0) to unlock next tier
        if (score > 0 && survivalTierNum >= nextState.survivalMaxTier && survivalTierNum < 5) {
          nextState.survivalMaxTier = survivalTierNum + 1;
        }
        
        // Frugal check: survived with >=80% salary
        if (survivalSalary && score >= survivalSalary * 0.8) {
          nextState.frugalSurvival = true;
        }
      }
    } else if (mode === 'data') {
      nextState.dataCount += 1;
      nextState.dataBest = Math.max(state.dataBest, score);
      if (isPerfect) nextState.dataPerfect = true;
    } else if (mode === 'journey') {
      nextState.journeyCount += 1;
      nextState.journeyBest = Math.max(state.journeyBest, score);
      if (journeyNetWorth !== undefined) {
        nextState.journeyBestNetWorth = Math.max(state.journeyBestNetWorth ?? 0, journeyNetWorth);
      }
      if (journeyEndingId) {
        if (!nextState.journeyEndings.includes(journeyEndingId)) {
          nextState.journeyEndings = [...nextState.journeyEndings, journeyEndingId];
        }
        if (rankOfEnding(journeyEndingId) >= rankOfEnding(nextState.journeyBestEnding)) {
          nextState.journeyBestEnding = journeyEndingId;
        }
      }
    } else if (mode === 'daily') {
      const today = dayjs().format('YYYY-MM-DD');
      if (nextState.dailyChallengeDone !== today) {
        nextState.dailyChallengeDone = today;
        nextState.dailyChallengeStreak += 1;
      }
    } else if (mode === 'budget') {
      nextState.budgetCount += 1;
      nextState.budgetBest = Math.max(state.budgetBest, score);
    } else if (mode === 'adventure') {
      nextState.adventureCount += 1;
      nextState.adventureBest = Math.max(state.adventureBest, score);
    }
    
    // Give coins
    nextState.coins += Math.floor(xpEarned / 100);

    // Check level & achievements
    const achCheck = checkAchievements(nextState);
    if (achCheck.newlyUnlocked.length > 0) {
      setNewBadges(achCheck.newlyUnlocked);
    }
    
    await saveGameState(achCheck.newState);
    setState(achCheck.newState);
    
    return { xpEarned, newlyUnlocked: achCheck.newlyUnlocked };
  }, [state, settings]);

  const clearBadges = () => setNewBadges([]);

  if (!state || !settingsReady) return null; // Loading

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (mode === 'menu' ? router.back() : setMode('menu'))} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arena Finansial</Text>
        <View style={{ width: 40 }} />
      </View>

      {mode === 'menu' && <MenuView styles={styles} state={state} settings={settings} go={setMode} />}
      {mode === 'quiz' && <QuizView styles={styles} settings={settings} onEnd={(score, streak) => handleGameEnd('quiz', score, false, streak)} quit={() => setMode('menu')} />}
      
      {mode === 'price' && <PriceView styles={styles} settings={settings} onEnd={(score, perfect) => handleGameEnd('price', score, perfect)} quit={() => setMode('menu')} />}
      
      {mode === 'survival-select' && <SurvivalSelectView styles={styles} state={state} settings={settings} setSettings={setSettings} go={setMode} />}
      
      {mode === 'survival' && <SurvivalView styles={styles} settings={settings} onEnd={(score, tierNum, salary) => handleGameEnd('survival', score, false, 0, tierNum, salary)} quit={() => setMode('survival-select')} />}
      
      {mode === 'data' && <DataChallengeView styles={styles} settings={settings} db={db} bookId={bookId} onEnd={(score, perfect) => handleGameEnd('data', score, perfect)} quit={() => setMode('menu')} />}

      {mode === 'journey' && <JourneyView styles={styles} settings={settings} seenEndings={state.journeyEndings} bestNetWorth={state.journeyBestNetWorth ?? 0} onEnd={(score: number, endingId?: string, netWorth?: number) => handleGameEnd('journey', score, false, 0, undefined, undefined, endingId, netWorth)} quit={() => setMode('menu')} />}
      
      {mode === 'daily' && <DailyChallengeView styles={styles} settings={settings} onEnd={(score: number) => handleGameEnd('daily', score, false)} quit={() => setMode('menu')} />}
      {mode === 'budget' && <BudgetChallengeView styles={styles} settings={settings} onEnd={(score: number) => handleGameEnd('budget', score, false)} quit={() => setMode('menu')} />}
      {mode === 'adventure' && <AdventureView styles={styles} settings={settings} onEnd={(score: number) => handleGameEnd('adventure', score, false)} quit={() => setMode('menu')} />}
      {mode === 'stats' && <StatsView styles={styles} state={state} quit={() => setMode('menu')} />}
      {mode === 'shop' && <ShopView styles={styles} state={state} onBuy={async (cost: number, id: string) => {
        if (state.coins >= cost) {
          const nextState = { ...state, coins: state.coins - cost, shopPurchases: [...state.shopPurchases, id] };
          await saveGameState(nextState);
          setState(nextState);
        }
      }} quit={() => setMode('menu')} />}
      
      {/* Badges Overlay */}
      {newBadges.length > 0 && mode === 'menu' && (
        <View style={styles.badgeOverlay}>
          <Card style={styles.badgePopup}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>🎉</Text>
            <Text style={styles.menuTitle}>Badge Baru Terbuka!</Text>
            {newBadges.map(b => (
              <View key={b.id} style={styles.badgePopupItem}>
                <Text style={{ fontSize: 24 }}>{b.icon}</Text>
                <View>
                  <Text style={styles.optText}>{b.title}</Text>
                  <Text style={styles.menuDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.nextBtn, { marginTop: 16 }]} onPress={clearBadges}>
              <Text style={styles.nextText}>Lanjut</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Menu View
// ─────────────────────────────────────────────────────────────────

function MenuView({ styles, state, settings, go }: { styles: any, state: GameState, settings: GameSettings, go: (m: Mode) => void }) {
  const { theme } = useTheme();
  const { current, next, progress } = getLevelProgress(state);
  const diff = difficultyOf(settings);
  
  const currentTier = SURVIVAL_TIERS.find(t => t.tier === settings.survivalTier) ?? SURVIVAL_TIERS[1];
  const today = dayjs().format('YYYY-MM-DD');
  const dailyDone = state.dailyChallengeDone === today;

  const items = [
    { mode: 'adventure', icon: 'map-outline', color: '#F59E0B', title: 'Petualangan Kota 🗺️', desc: 'Jelajahi kota, hadapi keputusan keuangan nyata!', best: state.adventureBest },
    { mode: 'budget', icon: 'pie-chart-outline', color: '#10B981', title: 'Tantangan Budget', desc: 'Alokasikan budget dengan cerdas dalam 60 detik.', best: state.budgetBest },
    { mode: 'data', icon: 'analytics-outline', color: '#E11D48', title: 'Tantangan Data Asli', desc: 'Uji wawasan dari catatan pengeluaranmu sendiri.', best: state.dataBest },
    { mode: 'quiz', icon: 'bulb-outline', color: theme.colors.warning, title: 'Kuis Cerdas Finansial', desc: `${settings.rounds} soal literasi keuangan, ${diff.time} detik/soal.`, best: state.quizBest },
    { mode: 'price', icon: 'pricetag-outline', color: theme.colors.info, title: 'Tebak Harga Pasar', desc: 'Asah feeling harga biar tak overbudget.', best: state.priceBest },
    { mode: 'survival-select', icon: 'wallet-outline', color: currentTier.color, title: `Survival Gajian ${currentTier.icon}`, desc: `Tier ${currentTier.tier}: ${currentTier.name} — ${currentTier.desc}`, best: state.survivalBest },
    { mode: 'journey', icon: 'footsteps-outline', color: '#8B5CF6', title: 'Perjalanan Hidup 🎒 BOSS 👹', desc: `6 latar • ${JOURNEY_RUN_LENGTH} peristiwa acak • kombo 🔥 • 8 ending + SECRET 🧘`, best: state.journeyBest },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Level Hero */}
      <Card gradient={theme.colors.heroGradient} glow style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 32 }}>{current.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSub}>Level {current.level}</Text>
            <Text style={styles.heroTitle}>{current.title}</Text>
          </View>
          <View style={styles.diffChip}>
            <Text style={styles.diffChipText}>{diff.icon} {diff.label}</Text>
          </View>
        </View>
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.heroSub}>{state.totalXp} XP</Text>
            <Text style={styles.heroSub}>{next ? `${next.xpRequired} XP` : 'MAX'}</Text>
          </View>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${progress}%`, backgroundColor: '#fff' }]} />
          </View>
        </View>
      </Card>

      {/* Stats & Shop Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { hapticLight(); go('stats'); }}>
          <Card style={{ padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="bar-chart-outline" size={20} color={theme.colors.info} />
            <Text style={styles.menuTitle}>Statistik</Text>
          </Card>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { hapticLight(); go('shop'); }}>
          <Card style={{ padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderColor: theme.colors.warning, borderWidth: 1 }}>
            <Text style={{ fontSize: 18 }}>🪙</Text>
            <Text style={styles.menuTitle}>{state.coins} Koin</Text>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Daily Challenge Highlight */}
      <TouchableOpacity onPress={() => { hapticLight(); go('daily'); }} style={{ marginTop: 8 }}>
        <Card style={[styles.menuCard, { borderColor: dailyDone ? theme.colors.border : theme.colors.primary, borderWidth: dailyDone ? 1 : 2 }]}>
          <View style={[styles.iconBg, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.menuTitle}>Duel Finansial Harian</Text>
              {!dailyDone && <View style={[styles.diffChip, { backgroundColor: theme.colors.danger }]}><Text style={styles.diffChipText}>BARU</Text></View>}
              {dailyDone && <View style={[styles.diffChip, { backgroundColor: theme.colors.success + '40' }]}><Text style={[styles.diffChipText, { color: theme.colors.success }]}>SELESAI</Text></View>}
            </View>
            <Text style={styles.menuDesc}>3 mini tantangan acak tiap hari.</Text>
            <Text style={styles.bestText}>Streak: {state.dailyChallengeStreak} hari 🔥</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </Card>
      </TouchableOpacity>

      {/* Badges Gallery */}
      <View>
        <Text style={[styles.menuTitle, { marginBottom: 8, marginTop: 8 }]}>Koleksi Badge ({state.unlockedBadges.length}/{ACHIEVEMENTS.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {ACHIEVEMENTS.map(ach => {
            const unlocked = state.unlockedBadges.includes(ach.id);
            return (
              <View key={ach.id} style={[styles.badgeItem, !unlocked && { opacity: 0.3 }]}>
                <View style={[styles.iconBg, { backgroundColor: unlocked ? theme.colors.primary + '30' : theme.colors.surfaceCard }]}>
                  <Text style={{ fontSize: 24 }}>{unlocked ? ach.icon : '🔒'}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <Text style={[styles.menuTitle, { marginTop: 16 }]}>Pilih Mode Permainan</Text>
      {items.map((it) => (
        <TouchableOpacity key={it.mode} onPress={() => { hapticLight(); go(it.mode as Mode); }}>
          <Card style={styles.menuCard}>
            <View style={[styles.iconBg, { backgroundColor: it.color + '20' }]}>
              <Ionicons name={it.icon as any} size={24} color={it.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{it.title}</Text>
              <Text style={styles.menuDesc}>{it.desc}</Text>
              {it.best > 0 && <Text style={styles.bestText}>Terbaik: {it.best} pts</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────

function TimerBar({ secs, left, styles }: any) {
  const { theme } = useTheme();
  return (
    <View style={styles.timerTrack}>
      <View style={[styles.timerFill, { width: `${(left / secs) * 100}%`, backgroundColor: left <= 5 ? theme.colors.danger : theme.colors.primary }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Quiz View
// ─────────────────────────────────────────────────────────────────

function QuizView({ styles, settings, onEnd, quit }: { styles: any, settings: GameSettings, onEnd: (score: number, streak: number) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  const quizTime = difficultyOf(settings).time;
  // Transform questions to shuffle options immediately
  const [qs] = useState(() => {
    const selected = shuffle(QUIZ_QUESTIONS).slice(0, settings.rounds);
    return selected.map(q => {
      const correctStr = q.options[q.answer];
      const newOpts = shuffle([...q.options]);
      return { ...q, options: newOpts, answer: newOpts.indexOf(correctStr) };
    });
  });
  
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [endResult, setEndResult] = useState<any>(null);
  const [left, setLeft] = useState(quizTime);
  const q = qs[idx];

  useEffect(() => {
    if (done || picked !== null) return;
    if (left <= 0) {
      const t = setTimeout(() => pick(-1), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft((v: number) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, picked, done]);

  function pick(i: number) {
    if (picked !== null || done) return;
    setPicked(i);
    if (i === q.answer) {
      const pts = 100 + left * 5 + (streak >= 2 ? 50 : 0);
      setScore(s => s + pts);
      setStreak(s => s + 1);
      if (settings.haptics) hapticSuccess();
    } else {
      setStreak(0);
      if (settings.haptics) hapticError();
    }
  }

  async function next() {
    hapticLight();
    if (idx + 1 >= qs.length) {
      setDone(true);
      const res = await onEnd(score, streak);
      setEndResult(res);
    } else {
      setIdx(v => v + 1);
      setPicked(null);
      setLeft(quizTime);
    }
  }

  if (done) return <ResultView styles={styles} score={score} result={endResult} title="Kuis Selesai!" quit={quit} unit="pts" rank={rankFor(score)} />;

  return (
    <View style={styles.play}>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Soal {idx + 1}/{qs.length}</Text>
        <Text style={styles.meta}>Skor {score}</Text>
        <Text style={[styles.meta, { color: theme.colors.warning }]}>Streak x{streak}</Text>
      </View>
      <TimerBar secs={quizTime} left={left} styles={styles} />
      <Card style={styles.qCard}>
        <Text style={styles.qText}>{q.q}</Text>
      </Card>
      {q.options.map((op: string, i: number) => {
        const isAns = picked !== null && i === q.answer;
        const isWrong = picked === i && i !== q.answer;
        return (
          <TouchableOpacity
            key={i}
            disabled={picked !== null}
            onPress={() => pick(i)}
            style={[styles.opt, isAns && styles.optRight, isWrong && styles.optWrong]}
          >
            <Text style={styles.optText}>{op}</Text>
            {isAns && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
            {isWrong && <Ionicons name="close-circle" size={20} color={theme.colors.danger} />}
          </TouchableOpacity>
        );
      })}
      {picked !== null && (
        <Card style={styles.tipCard}>
          <Text style={styles.tipText}>
            {picked === q.answer ? 'Benar! ' : picked === -1 ? 'Waktu habis! ' : 'Kurang tepat. '}
            {settings.showTips ? q.tip : ''}
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextText}>{idx + 1 >= qs.length ? 'Lihat Hasil' : 'Lanjut'}</Text>
          </TouchableOpacity>
        </Card>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Price View
// ─────────────────────────────────────────────────────────────────

function PriceView({ styles, settings, onEnd, quit }: { styles: any, settings: GameSettings, onEnd: (score: number, perfect: boolean) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  const quizTime = difficultyOf(settings).time;
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [endResult, setEndResult] = useState<any>(null);
  const [left, setLeft] = useState(quizTime);
  
  // Fetch products from DummyJSON and combine with local PRICE_ITEMS
  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch('https://dummyjson.com/products?limit=100');
        const data = await res.json();
        const apiItems = data.products.map((p: any) => {
          // Convert USD to IDR (approximate 15000) and round to nearest 1000
          const idrPrice = Math.round((p.price * 15000) / 1000) * 1000;
          let icon = 'cube-outline';
          if (p.category.includes('beauty') || p.category.includes('fragrance')) icon = 'sparkles-outline';
          if (p.category.includes('furniture')) icon = 'bed-outline';
          if (p.category.includes('grocery')) icon = 'basket-outline';
          if (p.category.includes('electronics') || p.category.includes('laptop') || p.category.includes('phone')) icon = 'laptop-outline';
          if (p.category.includes('vehicle') || p.category.includes('motor')) icon = 'car-sport-outline';
          if (p.category.includes('clothing') || p.category.includes('shirt') || p.category.includes('dress') || p.category.includes('shoes')) icon = 'shirt-outline';
          
          return {
            name: p.title,
            icon,
            price: idrPrice,
            tip: p.description,
          };
        });
        
        const combined = shuffle([...PRICE_ITEMS, ...apiItems]).slice(0, settings.rounds);
        setItems(combined);
      } catch (e) {
        // Fallback to local data if API fails
        setItems(shuffle(PRICE_ITEMS).slice(0, settings.rounds));
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [settings.rounds]);

  const item = items[idx];
  
  // Deduplicate and randomize options
  const options = useMemo(() => {
    if (!item) return [];
    const opts = new Set<number>();
    opts.add(item.price);
    const mults = [0.6, 0.8, 1.2, 1.4, 1.6];
    let mIdx = 0;
    while (opts.size < 4 && mIdx < mults.length) {
      opts.add(Math.round((item.price * mults[mIdx]) / 500) * 500);
      mIdx++;
    }
    // Fallback if needed
    while (opts.size < 4) opts.add(item.price + opts.size * 500);
    return shuffle(Array.from(opts));
  }, [item?.price]);

  useEffect(() => {
    if (loading || done || picked !== null) return;
    if (left <= 0) {
      const t = setTimeout(() => pick(-1), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft((v: number) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, picked, done, loading]);

  function pick(v: number) {
    if (picked !== null || done) return;
    setPicked(v);
    if (v === item.price) {
      setScore(s => s + 100 + left * 5);
      setCorrectCount(c => c + 1);
      if (settings.haptics) hapticSuccess();
    } else if (settings.haptics) hapticError();
  }

  async function next() {
    hapticLight();
    if (idx + 1 >= items.length) {
      setDone(true);
      const res = await onEnd(score, correctCount === items.length);
      setEndResult(res);
    } else {
      setIdx(v => v + 1);
      setPicked(null);
      setLeft(quizTime);
    }
  }

  if (loading) {
    return (
      <View style={[styles.play, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.meta, { marginTop: 16 }]}>Mengambil data pasar terbaru...</Text>
      </View>
    );
  }

  if (done) return <ResultView styles={styles} score={score} result={endResult} title="Tebakan Selesai!" quit={quit} unit="pts" rank={rankFor(score)} />;

  if (!item) return null;

  return (
    <View style={styles.play}>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Ronde {idx + 1}/{items.length}</Text>
        <Text style={styles.meta}>Skor {score}</Text>
        <Text style={styles.meta}>{left}s</Text>
      </View>
      <TimerBar secs={quizTime} left={left} styles={styles} />
      <Card style={styles.qCard}>
        <Ionicons name={item.icon as any} size={40} color={theme.colors.info} />
        <Text style={styles.qText}>{item.name}</Text>
        <Text style={styles.menuDesc}>Berapa harga wajarnya?</Text>
      </Card>
      {options.map((v: number) => {
        const ok = picked !== null && v === item.price;
        const bad = picked === v && v !== item.price;
        return (
          <TouchableOpacity key={v} disabled={picked !== null} onPress={() => pick(v)} style={[styles.opt, ok && styles.optRight, bad && styles.optWrong]}>
            <Text style={styles.optText}>{formatRupiah(v)}</Text>
          </TouchableOpacity>
        );
      })}
      {picked !== null && (
        <Card style={styles.tipCard}>
          <Text style={styles.tipText}>
            {picked === item.price ? 'Tepat! ' : `Harga benar ${formatRupiah(item.price)}. `}
            {settings.showTips ? item.tip : ''}
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextText}>{idx + 1 >= items.length ? 'Lihat Hasil' : 'Lanjut'}</Text>
          </TouchableOpacity>
        </Card>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Survival Tier Select View
// ─────────────────────────────────────────────────────────────────

function SurvivalSelectView({ styles, state, settings, setSettings, go }: { styles: any, state: GameState, settings: GameSettings, setSettings: (s: GameSettings) => void, go: (m: Mode) => void }) {
  const { theme } = useTheme();

  async function selectTier(tier: number) {
    hapticLight();
    const newSettings = { ...settings, survivalTier: tier };
    setSettings(newSettings);
    await saveGameSettings(newSettings);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.menuTitle, { fontSize: 18, marginBottom: 4 }]}>Pilih Tier Survival</Text>
      <Text style={styles.menuDesc}>Selesaikan tier saat ini (saldo {'>'} 0) untuk membuka tier berikutnya.</Text>
      
      {SURVIVAL_TIERS.map(tier => {
        const isSelected = settings.survivalTier === tier.tier;
        const isLocked = tier.tier > state.survivalMaxTier;
        const best = state.survivalTierBest[tier.tier] ?? 0;
        return (
          <TouchableOpacity
            key={tier.tier}
            disabled={isLocked}
            onPress={() => selectTier(tier.tier)}
            activeOpacity={0.7}
          >
            <Card style={[styles.menuCard, isSelected && { borderColor: tier.color, borderWidth: 2 }, isLocked && { opacity: 0.4 }]}>
              <View style={[styles.iconBg, { backgroundColor: tier.color + '20' }]}>
                <Text style={{ fontSize: 22 }}>{isLocked ? '🔒' : tier.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.menuTitle}>Tier {tier.tier}: {tier.name}</Text>
                  {isSelected && <View style={[styles.diffChip, { backgroundColor: tier.color + '30' }]}><Text style={[styles.diffChipText, { color: tier.color }]}>Dipilih</Text></View>}
                </View>
                <Text style={styles.menuDesc}>{tier.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={[styles.bestText, { color: tier.color }]}>XP x{tier.xpMult}</Text>
                  {tier.hideEffect && <Text style={styles.meta}>🎭 Hidden</Text>}
                  {tier.hasChainEvents && <Text style={styles.meta}>🔗 Chain</Text>}
                  {tier.hasTimer && <Text style={styles.meta}>⏱ Timer</Text>}
                </View>
                {best > 0 && <Text style={styles.bestText}>Terbaik: {formatRupiah(best)}</Text>}
              </View>
              {!isLocked && <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />}
            </Card>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.nextBtn, { marginTop: 8, backgroundColor: (SURVIVAL_TIERS.find(t => t.tier === settings.survivalTier) ?? SURVIVAL_TIERS[1]).color }]}
        onPress={() => { hapticLight(); go('survival'); }}
      >
        <Text style={styles.nextText}>Mulai Survival Tier {settings.survivalTier}!</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.ghostBtn, { marginTop: 4 }]} onPress={() => go('menu')}>
        <Text style={styles.ghostText}>Kembali ke Menu</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Survival View (with tier mechanics)
// ─────────────────────────────────────────────────────────────────

function SurvivalView({ styles, settings, onEnd, quit }: { styles: any, settings: GameSettings, onEnd: (score: number, tierNum: number, salary: number) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  const tier = SURVIVAL_TIERS.find(t => t.tier === settings.survivalTier) ?? SURVIVAL_TIERS[1];
  
  // Build event list: shuffle and pick based on tier eventCount, include chain events for tier 4-5
  const [events] = useState(() => {
    let pool = shuffle(SURVIVAL_EVENTS);
    if (!tier.hasChainEvents) {
      // Strip chain events for lower tiers
      pool = pool.map(e => ({ ...e, chainEvent: undefined }));
    }
    return pool.slice(0, tier.eventCount);
  });
  
  const [idx, setIdx] = useState(0);
  const [balance, setBalance] = useState(tier.salary);
  const [saved, setSaved] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [lastNote, setLastNote] = useState<string | null>(null);
  const [endResult, setEndResult] = useState<any>(null);
  const [chainQueue, setChainQueue] = useState<typeof SURVIVAL_EVENTS>([]);
  const [timerLeft, setTimerLeft] = useState(tier.hasTimer ? tier.timerSeconds : 0);
  const [revealed, setRevealed] = useState(false); // for hidden effect reveal after choice

  // Current event: check chain queue first, then main events
  const currentEvent = chainQueue.length > 0 ? chainQueue[0] : events[idx];
  const isChainEvent = chainQueue.length > 0;

  // Timer effect for tier 5
  useEffect(() => {
    if (!tier.hasTimer || done || revealed) return;
    if (timerLeft <= 0) {
      // Auto-choose the more expensive option
      const aAbs = Math.abs(currentEvent.aEffect);
      const bAbs = Math.abs(currentEvent.bEffect);
      const worstSide = aAbs >= bAbs ? 'a' : 'b';
      choose(worstSide);
      return;
    }
    const t = setTimeout(() => setTimerLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timerLeft, done, revealed, tier.hasTimer]);

  async function choose(side: 'a' | 'b') {
    if (settings.haptics) hapticLight();
    const ev = currentEvent;
    const eff = side === 'a' ? ev.aEffect : ev.bEffect;
    const note = side === 'a' ? ev.aNote : ev.bNote;
    const nb = balance + eff;
    if (idx === 0 && !isChainEvent && side === 'a' && eff === -600000) setSaved(600000);
    setBalance(nb);
    setLastNote(note);
    setRevealed(true);
    setLog((l) => [...l, `${ev.day}: ${ev.title} (${eff >= 0 ? '+' : ''}${formatRupiah(eff)})`]);
    
    if (nb < 0) {
      setDone(true);
      if (settings.haptics) hapticError();
      setEndResult(await onEnd(0, tier.tier, tier.salary));
      return;
    }

    // Queue chain event if applicable (only trigger on tier 4+)
    if (tier.hasChainEvents && ev.chainEvent && !isChainEvent) {
      // 60% chance chain event fires
      if (Math.random() < 0.6) {
        setChainQueue([ev.chainEvent]);
      }
    }
  }

  function advance() {
    hapticLight();
    setRevealed(false);
    setLastNote(null);
    
    if (isChainEvent) {
      // Dequeue chain event
      setChainQueue(q => q.slice(1));
      setTimerLeft(tier.hasTimer ? tier.timerSeconds : 0);
      return;
    }
    
    if (idx + 1 >= events.length) {
      setDone(true);
      onEnd(balance, tier.tier, tier.salary).then(setEndResult);
    } else {
      setIdx(v => v + 1);
      setTimerLeft(tier.hasTimer ? tier.timerSeconds : 0);
    }
  }

  if (done) {
    const pct = balance / tier.salary;
    const grade = balance <= 0 ? 'Bangkrut! Coba lagi.' : pct >= 0.8 ? '👑 Raja Hemat!' : pct >= 0.6 ? 'Sultan Bertahan!' : pct >= 0.4 ? 'Hemat Mantap!' : 'Pas-pasan!';
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card gradient={theme.colors.heroGradient} glow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 20 }}>{tier.icon}</Text>
            <Text style={styles.heroSub}>Tier {tier.tier}: {tier.name}</Text>
          </View>
          <Text style={styles.heroTitle}>{grade}</Text>
          <Text style={styles.heroSub}>Sisa saldo: {formatRupiah(Math.max(0, balance))} / {formatRupiah(tier.salary)}</Text>
          <Text style={styles.heroSub}>{Math.round(Math.max(0, balance) / tier.salary * 100)}% saldo tersisa</Text>
          {endResult?.xpEarned > 0 && <Text style={[styles.heroSub, { color: theme.colors.warning, fontWeight: 'bold', marginTop: 4 }]}>+{endResult.xpEarned} XP (x{tier.xpMult})</Text>}
          {balance > 0 && tier.tier < 5 && tier.tier >= (endResult?.newlyUnlocked ? 1 : 0) && (
            <Text style={[styles.heroSub, { marginTop: 4 }]}>🔓 Tier {tier.tier + 1} terbuka!</Text>
          )}
        </Card>
        {log.map((l, i) => (
          <View key={i} style={styles.logRow}><Text style={styles.logText}>{l}</Text></View>
        ))}
        <View style={styles.rowBtns}>
          <TouchableOpacity style={styles.ghostBtn} onPress={quit}><Text style={styles.ghostText}>Pilih Tier</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const ev = currentEvent;
  const balPct = Math.max(0, Math.min(100, (balance / tier.salary) * 100));
  const eventProgress = `Event ${idx + 1}/${events.length}${isChainEvent ? ' 🔗' : ''}`;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Tier indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{tier.icon}</Text>
          <Text style={[styles.meta, { color: tier.color }]}>Tier {tier.tier}: {tier.name}</Text>
        </View>
        {tier.hasTimer && !revealed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="timer-outline" size={16} color={timerLeft <= 5 ? theme.colors.danger : tier.color} />
            <Text style={[styles.meta, { color: timerLeft <= 5 ? theme.colors.danger : tier.color, fontSize: 16, fontWeight: '800' }]}>{timerLeft}s</Text>
          </View>
        )}
      </View>

      {tier.hasTimer && !revealed && (
        <TimerBar secs={tier.timerSeconds} left={timerLeft} styles={styles} />
      )}

      <Card style={[styles.qCard, isChainEvent && { borderColor: theme.colors.warning, borderWidth: 2 }]}>
        <Text style={styles.meta}>{eventProgress} • Saldo {formatRupiah(balance)}</Text>
        <View style={styles.balBar}>
          <View style={[styles.balFill, { width: `${balPct}%`, backgroundColor: balPct < 20 ? theme.colors.danger : balPct < 50 ? theme.colors.warning : theme.colors.success }]} />
        </View>
        {isChainEvent && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 14 }}>🔗</Text>
            <Text style={[styles.meta, { color: theme.colors.warning }]}>CHAIN EVENT!</Text>
          </View>
        )}
        <Text style={styles.qText}>{ev.title}</Text>
        <Text style={styles.menuDesc}>{ev.desc}</Text>
        {revealed && lastNote && (
          <Card style={styles.tipCard}>
            <Text style={styles.tipText}>{lastNote}</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={advance}>
              <Text style={styles.nextText}>Lanjut</Text>
            </TouchableOpacity>
          </Card>
        )}
      </Card>

      {!revealed && (
        <>
          <TouchableOpacity style={[styles.opt, { borderColor: tier.color + '40' }]} onPress={() => choose('a')}>
            <Text style={styles.optText}>{ev.aLabel}</Text>
            {tier.hideEffect
              ? <Text style={[styles.menuDesc, { color: tier.color, fontWeight: '700' }]}>???</Text>
              : <Text style={styles.menuDesc}>{formatRupiah(ev.aEffect)}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={[styles.opt, { borderColor: tier.color + '40' }]} onPress={() => choose('b')}>
            <Text style={styles.optText}>{ev.bLabel}</Text>
            {tier.hideEffect
              ? <Text style={[styles.menuDesc, { color: tier.color, fontWeight: '700' }]}>???</Text>
              : <Text style={styles.menuDesc}>{formatRupiah(ev.bEffect)}</Text>
            }
          </TouchableOpacity>
        </>
      )}
      {saved > 0 && <Text style={styles.bestText}>Tabungan diamankan: {formatRupiah(saved)}</Text>}
    </ScrollView>
  );
}


// ─────────────────────────────────────────────────────────────────
// Journey View (Perjalanan Hidup 18 → 60)
// ─────────────────────────────────────────────────────────────────

function fmtDelta(n: number): string {
  if (n === 0) return '±0';
  const sign = n > 0 ? '+' : '−';
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${sign}Rp${Math.round(abs / 1000000)}jt`;
  if (abs >= 1000) return `${sign}Rp${Math.round(abs / 1000)}rb`;
  return `${sign}${abs}`;
}

function JourneyView({ styles, settings, seenEndings = [], bestNetWorth = 0, onEnd, quit }: { styles: any, settings: GameSettings, seenEndings?: string[], bestNetWorth?: number, onEnd: (score: number, endingId: string, netWorth: number) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  const [bg, setBg] = useState<JourneyBackground | null>(null);
  const [run, setRun] = useState<JourneyEvent[]>(() => pickJourneyRun());
  const [idx, setIdx] = useState(0);
  const [cash, setCash] = useState(0);
  const [aset, setAset] = useState(0);
  const [utang, setUtang] = useState(0);
  const [bahagia, setBahagia] = useState(70);
  const [poin, setPoin] = useState(0);
  const [credited, setCredited] = useState(0);
  const [picked, setPicked] = useState<'a' | 'b' | 'c' | null>(null);
  const [wiseStreak, setWiseStreak] = useState(0);
  const [lastDelta, setLastDelta] = useState<{ cash: number; bahagia: number; poin: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [ending, setEnding] = useState<JourneyEnding | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalNetWorth, setFinalNetWorth] = useState(0);
  const [endResult, setEndResult] = useState<any>(null);

  const netWorth = cash + aset - utang;

  function start(b: JourneyBackground) {
    hapticLight();
    const s1 = LIFE_STAGES[0];
    setBg(b);
    setCash(b.cash + s1.income);
    setAset(b.aset);
    setUtang(b.utang);
    setBahagia(b.bahagia);
    setCredited(1);
    setLog([`${b.icon} Latar: ${b.name}`, `${s1.icon} ${s1.name}: pemasukan +${formatRupiah(s1.income)}`]);
  }

  async function finish(fCash: number, fAset: number, fUtang: number, fBahagia: number, fPoin: number, bankrupt: boolean) {
    const nw = fCash + fAset - fUtang;
    const end = bankrupt ? JOURNEY_ENDINGS[0] : endingFor(nw, fBahagia);
    const sc = bankrupt ? Math.floor(fPoin / 2) : scoreJourney(fPoin, nw, fBahagia);
    setEnding(end);
    setFinalScore(sc);
    setFinalNetWorth(nw);
    setDone(true);
    if (settings.haptics) {
      if (bankrupt) hapticError();
      else hapticSuccess();
    }
    setEndResult(await onEnd(sc, end.id, nw));
  }

  function choose(side: 'a' | 'b' | 'c') {
    if (picked || done || !bg) return;
    if (settings.haptics) hapticLight();
    const ev = run[idx];
    const c: JourneyChoice = side === 'a' ? ev.a : side === 'b' ? ev.b : ev.c!;
    const nc = cash + c.cash;
    const na = Math.max(0, aset + c.aset);
    const nu = Math.max(0, utang + c.utang);
    const nb = Math.max(0, Math.min(100, bahagia + c.bahagia));
    const basePts = pointsFor(ev, c.poin);
    const isWise = c.poin >= WISE_POIN_THRESHOLD;
    const newStreak = isWise ? wiseStreak + 1 : 0;
    const bonus = comboBonus(newStreak);
    const gained = basePts + bonus;
    const np = poin + gained;
    setCash(nc);
    setAset(na);
    setUtang(nu);
    setBahagia(nb);
    setPoin(np);
    setWiseStreak(newStreak);
    setLastDelta({ cash: c.cash, bahagia: c.bahagia, poin: gained });
    setPicked(side);
    if (settings.haptics) {
      if (isWise) hapticSuccess();
      else hapticError();
    }
    setLog((l) => [...l, `${ev.age}: ${ev.title} (+${gained} poin${bonus > 0 ? `, kombo x${newStreak}` : ''}${ev.isBoss ? ', BOSS!' : ''})`]);
    if (nc < 0 && na <= 0) {
      finish(nc, na, nu, nb, np, true);
    }
  }

  function advance() {
    hapticLight();
    setPicked(null);
    setLastDelta(null);
    if (idx + 1 >= run.length) {
      finish(cash, aset, utang, bahagia, poin, false);
      return;
    }
    const next = run[idx + 1];
    if (next.stage > credited) {
      const st = LIFE_STAGES.find((s) => s.stage === next.stage)!;
      setCash((c) => c + st.income);
      setLog((l) => [...l, `${st.icon} Memasuki ${st.name}: pemasukan +${formatRupiah(st.income)}`]);
      setCredited(next.stage);
    }
    setIdx((v) => v + 1);
  }

  function restart() {
    hapticLight();
    setBg(null);
    setRun(pickJourneyRun());
    setIdx(0);
    setCash(0);
    setAset(0);
    setUtang(0);
    setBahagia(70);
    setPoin(0);
    setCredited(0);
    setPicked(null);
    setWiseStreak(0);
    setLastDelta(null);
    setLog([]);
    setDone(false);
    setEnding(null);
    setFinalScore(0);
    setFinalNetWorth(0);
    setEndResult(null);
  }

  // ─── Latar select ───
  if (!bg) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.menuTitle, { fontSize: 18, marginBottom: 4 }]}>Pilih Latar Hidupmu</Text>
        <Text style={styles.menuDesc}>Jalani {JOURNEY_RUN_LENGTH} peristiwa dari usia 18 hingga pensiun di usia 60. Tiap babak diambil acak 3 dari 5 kejadian — setiap hidup berbeda! Kalahkan BOSS 👹, jaga kombo bijak 🔥, temukan SECRET ending 🧘.</Text>
        {bestNetWorth > 0 && (
          <Text style={[styles.meta, { marginTop: 4 }]}>Net worth terbaikmu: {formatRupiah(bestNetWorth)} • Ending: {seenEndings.length}/{JOURNEY_ENDINGS.length}</Text>
        )}
        {JOURNEY_BACKGROUNDS.map((b) => (
          <TouchableOpacity key={b.id} onPress={() => start(b)} activeOpacity={0.7}>
            <Card style={styles.menuCard}>
              <View style={[styles.iconBg, { backgroundColor: '#8B5CF620' }]}>
                <Text style={{ fontSize: 24 }}>{b.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{b.name}</Text>
                <Text style={styles.menuDesc}>{b.desc}</Text>
                <Text style={styles.bestText}>Kas {formatRupiah(b.cash)}{b.aset > 0 ? ` • Aset ${formatRupiah(b.aset)}` : ''}{b.utang > 0 ? ` • Utang ${formatRupiah(b.utang)}` : ''} • 😊 {b.bahagia}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Card>
          </TouchableOpacity>
        ))}
        {/* Galeri ending */}
        <Text style={[styles.menuTitle, { marginTop: 8 }]}>Galeri Takdir ({seenEndings.length}/{JOURNEY_ENDINGS.length})</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {JOURNEY_ENDINGS.map((e) => {
            const seen = seenEndings.includes(e.id);
            const isSecret = e.id === 'bahagia_sejati';
            return (
              <View key={e.id} style={[styles.statMini, { minWidth: '30%', flexGrow: 1, opacity: seen ? 1 : 0.45 }]}>
                <Text style={{ fontSize: 22, textAlign: 'center' }}>{seen ? e.icon : isSecret ? '❓' : '🔒'}</Text>
                <Text style={[styles.statMiniLabel, { textAlign: 'center' }]}>{seen ? e.title : isSecret ? '??? Secret' : e.title}</Text>
              </View>
            );
          })}
        </View>
        <TouchableOpacity style={[styles.ghostBtn, { marginTop: 4 }]} onPress={quit}>
          <Text style={styles.ghostText}>Kembali ke Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Ending ───
  if (done && ending) {
    const isNewEnding = endResult?.newlyUnlocked?.length > 0;
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card gradient={theme.colors.heroGradient} glow>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>{ending.icon}</Text>
          <Text style={[styles.heroTitle, { textAlign: 'center', marginTop: 8 }]}>{ending.title}</Text>
          {ending.id === 'bahagia_sejati' && (
            <Text style={[styles.heroSub, { textAlign: 'center', fontWeight: '800' }]}>✨ SECRET ENDING TERBUKA! ✨</Text>
          )}
          {ending.id === 'legenda' && (
            <Text style={[styles.heroSub, { textAlign: 'center', fontWeight: '800' }]}>🏛️ PENCAPAIAN TERTINGGI! 🏛️</Text>
          )}
          <Text style={[styles.heroSub, { textAlign: 'center' }]}>{ending.desc}</Text>
          <Text style={[styles.bigScore, { textAlign: 'center' }]}>{finalScore} pts</Text>
          <Text style={[styles.heroSub, { textAlign: 'center' }]}>Net worth: {formatRupiah(Math.max(0, finalNetWorth))} • 😊 {bahagia} • 🎯 {poin} poin keputusan</Text>
          {endResult?.xpEarned > 0 && (
            <Text style={[styles.heroSub, { color: theme.colors.warning, fontWeight: 'bold', marginTop: 8, textAlign: 'center' }]}>
              +{endResult.xpEarned} XP!
            </Text>
          )}
          {isNewEnding && <Text style={[styles.heroSub, { textAlign: 'center', marginTop: 4 }]}>🎉 Badge baru terbuka! Cek di menu.</Text>}
        </Card>
        {log.map((l, i) => (
          <View key={i} style={styles.logRow}><Text style={styles.logText}>{l}</Text></View>
        ))}
        <View style={styles.rowBtns}>
          <TouchableOpacity style={styles.ghostBtn} onPress={restart}><Text style={styles.ghostText}>Ulangi Hidup</Text></TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={quit}><Text style={styles.nextText}>Menu Game</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── Playing ───
  const ev = run[idx];
  const stage = LIFE_STAGES.find((s) => s.stage === credited) ?? LIFE_STAGES[0];
  const stats = [
    { label: 'Kas', value: formatRupiah(cash), color: cash < 0 ? theme.colors.danger : theme.colors.success },
    { label: 'Aset', value: formatRupiah(aset), color: theme.colors.info },
    { label: 'Utang', value: formatRupiah(utang), color: utang > 0 ? theme.colors.danger : theme.colors.textSecondary },
    { label: 'Bahagia', value: `${bahagia}`, color: theme.colors.warning },
  ];
  const pickedChoice: JourneyChoice | null = picked === 'a' ? ev.a : picked === 'b' ? ev.b : picked === 'c' ? ev.c ?? null : null;
  const showPreview = settings.difficulty === 'easy';
  const previewOf = (c: JourneyChoice) => `${fmtDelta(c.cash + c.aset - c.utang)} • ${c.bahagia >= 0 ? '+' : ''}${c.bahagia}😊 • +${pointsFor(ev, c.poin)}pts`;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{stage.icon}</Text>
          <Text style={[styles.meta, { color: stage.color }]}>{stage.name}</Text>
        </View>
        <Text style={styles.meta}>Peristiwa {idx + 1}/{run.length}</Text>
      </View>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${((idx + 1) / run.length) * 100}%`, backgroundColor: '#8B5CF6' }]} />
      </View>
      {/* Timeline babak */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {LIFE_STAGES.map((s) => (
          <View key={s.stage} style={{ alignItems: 'center', opacity: s.stage <= credited ? 1 : 0.35 }}>
            <Text style={{ fontSize: 16 }}>{s.icon}</Text>
            <View style={{ width: 22, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: s.stage <= credited ? s.color : theme.colors.track }} />
          </View>
        ))}
        {wiseStreak >= 2 && (
          <View style={[styles.diffChip, { backgroundColor: '#F59E0B30' }]}>
            <Text style={[styles.diffChipText, { color: '#F59E0B' }]}>🔥 x{wiseStreak}</Text>
          </View>
        )}
      </View>

      <View style={styles.statGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statMini}>
            <Text style={styles.statMiniLabel}>{s.label}</Text>
            <Text style={[styles.statMiniValue, { color: s.color }]} numberOfLines={1}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Card style={[styles.qCard, ev.isBoss && { borderColor: '#EF4444', borderWidth: 2 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {ev.isBoss && <Text style={{ fontSize: 14 }}>👹</Text>}
          <Text style={[styles.meta, ev.isBoss && { color: '#EF4444' }]}>{ev.isBoss ? `BOSS • ${ev.age}` : `${ev.age}`} • {poin} poin{ev.isBoss ? ' • 1.5x poin!' : ''}</Text>
        </View>
        <Text style={styles.qText}>{ev.title}</Text>
        <Text style={styles.menuDesc}>{ev.desc}</Text>
        {picked && pickedChoice && lastDelta && (
          <Card style={styles.tipCard}>
            <Text style={styles.tipText}>
              {pickedChoice.poin >= WISE_POIN_THRESHOLD ? 'Pilihan bijak! ' : 'Hmm, berisiko. '}
              {`+${lastDelta.poin} poin${wiseStreak >= 2 ? ` (kombo x${wiseStreak}! 🔥)` : ''} • Kas ${fmtDelta(lastDelta.cash)} • 😊 ${lastDelta.bahagia >= 0 ? '+' : ''}${lastDelta.bahagia}\n`}
              {settings.showTips ? pickedChoice.note : ''}
            </Text>
            <TouchableOpacity style={styles.nextBtn} onPress={advance}>
              <Text style={styles.nextText}>{idx + 1 >= run.length ? 'Lihat Masa Tuamu' : 'Jalani Hidup ➜'}</Text>
            </TouchableOpacity>
          </Card>
        )}
      </Card>

      {!picked && (
        <>
          {(['a', 'b', 'c'] as const).filter((k) => (k === 'c' ? !!ev.c : true)).map((k) => {
            const c = k === 'a' ? ev.a : k === 'b' ? ev.b : ev.c!;
            return (
              <TouchableOpacity key={k} style={[styles.opt, { borderColor: ev.isBoss ? '#EF444440' : '#8B5CF640' }]} onPress={() => choose(k)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optText}>{c.label}</Text>
                  {showPreview && <Text style={styles.menuDesc}>{previewOf(c)}</Text>}
                  {settings.difficulty === 'normal' && <Text style={styles.menuDesc}>{c.poin >= WISE_POIN_THRESHOLD ? '💡 Terlihat bijak' : '⚠️ Terlihat berisiko'}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}


// ─────────────────────────────────────────────────────────────────
// Data Challenge View
// ─────────────────────────────────────────────────────────────────

function DataChallengeView({ styles, settings, db, bookId, onEnd, quit }: { styles: any, settings: GameSettings, db: SQLiteDatabase, bookId: number, onEnd: (score: number, perfect: boolean) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  const [qs, setQs] = useState<DataQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [endResult, setEndResult] = useState<any>(null);

  useEffect(() => {
    generateDataQuestions(db, bookId).then(questions => {
      // Pick random questions based on settings
      const selected = shuffle(questions).slice(0, settings.rounds);
      setQs(selected);
      setLoading(false);
    });
  }, [db, bookId, settings.rounds]);

  function pick(i: number) {
    if (picked !== null || done) return;
    setPicked(i);
    if (i === qs[idx].answer) {
      setScore(s => s + 200); // 200 pts for correct data answer
      setCorrectCount(c => c + 1);
      if (settings.haptics) hapticSuccess();
    } else {
      if (settings.haptics) hapticError();
    }
  }

  async function next() {
    if (settings.haptics) hapticLight();
    if (idx + 1 >= qs.length) {
      setDone(true);
      const res = await onEnd(score, correctCount === qs.length);
      setEndResult(res);
    } else {
      setIdx(v => v + 1);
      setPicked(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.play, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.meta, { marginTop: 16 }]}>Menganalisa data transaksi...</Text>
      </View>
    );
  }

  if (qs.length === 0) {
    return (
      <View style={styles.play}>
        <Card style={styles.qCard}>
          <Ionicons name="folder-open-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.qText}>Data Belum Cukup</Text>
          <Text style={styles.menuDesc}>Kamu butuh lebih banyak catatan pengeluaran bulan ini dan bulan lalu agar sistem bisa membuat soal khusus untukmu. Catat transaksi dulu yuk!</Text>
          <TouchableOpacity style={[styles.nextBtn, { width: '100%', marginTop: 20 }]} onPress={quit}>
            <Text style={styles.nextText}>Kembali</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  if (done) return <ResultView styles={styles} score={score} result={endResult} title="Tantangan Data Selesai!" quit={quit} unit="pts" rank={rankFor(score)} />;

  const q = qs[idx];

  return (
    <View style={styles.play}>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Soal {idx + 1}/{qs.length}</Text>
        <Text style={styles.meta}>Skor {score}</Text>
      </View>
      <Card style={[styles.qCard, { borderColor: '#E11D48', borderWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="analytics" size={16} color="#E11D48" />
          <Text style={[styles.meta, { color: '#E11D48' }]}>DATA ASLI FINTRACK</Text>
        </View>
        <Text style={styles.qText}>{q.q}</Text>
      </Card>
      {q.options.map((op: string, i: number) => {
        const isAns = picked !== null && i === q.answer;
        const isWrong = picked === i && i !== q.answer;
        return (
          <TouchableOpacity
            key={i}
            disabled={picked !== null}
            onPress={() => pick(i)}
            style={[styles.opt, isAns && styles.optRight, isWrong && styles.optWrong]}
          >
            <Text style={styles.optText}>{op}</Text>
            {isAns && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
            {isWrong && <Ionicons name="close-circle" size={20} color={theme.colors.danger} />}
          </TouchableOpacity>
        );
      })}
      {picked !== null && (
        <Card style={styles.tipCard}>
          <Text style={styles.tipText}>
            {picked === q.answer ? 'Benar! ' : 'Kurang tepat. '}
            {settings.showTips ? q.tip : ''}
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextText}>{idx + 1 >= qs.length ? 'Lihat Hasil' : 'Lanjut'}</Text>
          </TouchableOpacity>
        </Card>
      )}
    </View>
  );
}


// ─────────────────────────────────────────────────────────────────
// Result View
// ─────────────────────────────────────────────────────────────────

function ResultView({ styles, score, result, title, quit, unit, rank }: any) {
  const { theme } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card gradient={theme.colors.heroGradient} glow>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.bigScore}>{score} {unit}</Text>
        <Text style={styles.heroSub}>Peringkat: {rank}</Text>
        {result?.xpEarned > 0 && (
          <Text style={[styles.heroSub, { color: theme.colors.warning, fontWeight: 'bold', marginTop: 8 }]}>
            +{result.xpEarned} XP!
          </Text>
        )}
      </Card>
      <View style={styles.rowBtns}>
        <TouchableOpacity style={styles.nextBtn} onPress={quit}><Text style={styles.nextText}>Menu Game</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Daily Challenge View
// ─────────────────────────────────────────────────────────────────
function DailyChallengeView({ styles, settings, onEnd, quit }: any) {
  const { theme } = useTheme();
  const [challenge] = useState(() => getDailyChallenge());
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [pricePicked, setPricePicked] = useState<number | null>(null);
  const [survPicked, setSurvPicked] = useState<'a' | 'b' | null>(null);
  
  const priceOptions = useMemo(() => {
    const opts = new Set<number>([challenge.price.price]);
    const mults = [0.6, 0.8, 1.2, 1.4];
    mults.forEach(m => opts.add(Math.round((challenge.price.price * m) / 500) * 500));
    return shuffle(Array.from(opts)).slice(0, 4);
  }, [challenge.price.price]);

  function nextStage() {
    if (stage === 0) setStage(1);
    else if (stage === 1) setStage(2);
    else {
      setDone(true);
      onEnd(score);
    }
  }

  if (done) return <ResultView styles={styles} score={score} result={null} title="Duel Harian Selesai!" quit={quit} unit="pts" rank={rankFor(score)} />;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.menuTitle}>Duel Finansial Harian</Text>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${((stage + 1) / 3) * 100}%`, backgroundColor: theme.colors.primary }]} />
      </View>
      <Text style={styles.meta}>Skor: {score} • Tahap {stage + 1}/3</Text>
      
      {stage === 0 && (
        <View style={{ gap: 12 }}>
          <Card style={styles.qCard}>
            <Text style={[styles.meta, { color: theme.colors.warning }]}>TAHAP 1: KUIS LITERASI</Text>
            <Text style={styles.qText}>{challenge.quiz.q}</Text>
          </Card>
          {challenge.quiz.options.map((op: string, i: number) => {
            const isAns = quizPicked !== null && i === challenge.quiz.answer;
            const isWrong = quizPicked === i && i !== challenge.quiz.answer;
            return (
              <TouchableOpacity key={i} disabled={quizPicked !== null} onPress={() => {
                setQuizPicked(i);
                if (i === challenge.quiz.answer) { setScore(s => s + 500); hapticSuccess(); } else { hapticError(); }
              }} style={[styles.opt, isAns && styles.optRight, isWrong && styles.optWrong]}>
                <Text style={styles.optText}>{op}</Text>
              </TouchableOpacity>
            );
          })}
          {quizPicked !== null && (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStage}><Text style={styles.nextText}>Lanjut</Text></TouchableOpacity>
          )}
        </View>
      )}

      {stage === 1 && (
        <View style={{ gap: 12 }}>
          <Card style={styles.qCard}>
            <Text style={[styles.meta, { color: theme.colors.info }]}>TAHAP 2: TEBAK HARGA</Text>
            <Ionicons name={challenge.price.icon as any} size={40} color={theme.colors.info} />
            <Text style={styles.qText}>{challenge.price.name}</Text>
          </Card>
          {priceOptions.map((v) => {
            const isAns = pricePicked !== null && v === challenge.price.price;
            const isWrong = pricePicked === v && v !== challenge.price.price;
            return (
              <TouchableOpacity key={v} disabled={pricePicked !== null} onPress={() => {
                setPricePicked(v);
                if (v === challenge.price.price) { setScore(s => s + 500); hapticSuccess(); } else { hapticError(); }
              }} style={[styles.opt, isAns && styles.optRight, isWrong && styles.optWrong]}>
                <Text style={styles.optText}>{formatRupiah(v)}</Text>
              </TouchableOpacity>
            );
          })}
          {pricePicked !== null && (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStage}><Text style={styles.nextText}>Lanjut</Text></TouchableOpacity>
          )}
        </View>
      )}

      {stage === 2 && (
        <View style={{ gap: 12 }}>
          <Card style={styles.qCard}>
            <Text style={[styles.meta, { color: theme.colors.danger }]}>TAHAP 3: KEPUTUSAN SULIT</Text>
            <Text style={styles.qText}>{challenge.survival.title}</Text>
            <Text style={styles.menuDesc}>{challenge.survival.desc}</Text>
          </Card>
          {(['a', 'b'] as const).map(k => {
            const ev = challenge.survival;
            const eff = k === 'a' ? ev.aEffect : ev.bEffect;
            const label = k === 'a' ? ev.aLabel : ev.bLabel;
            const note = k === 'a' ? ev.aNote : ev.bNote;
            return (
              <TouchableOpacity key={k} disabled={survPicked !== null} onPress={() => {
                setSurvPicked(k);
                if (eff >= 0 || (ev.aEffect < 0 && ev.bEffect < 0 && eff >= Math.min(ev.aEffect, ev.bEffect))) {
                  setScore(s => s + 500); hapticSuccess();
                } else {
                  hapticError();
                }
              }} style={[styles.opt, survPicked === k && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optText}>{label}</Text>
                  {survPicked !== null && <Text style={styles.menuDesc}>{formatRupiah(eff)} • {note}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
          {survPicked !== null && (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStage}><Text style={styles.nextText}>Selesai Duel</Text></TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Budget Challenge View
// ─────────────────────────────────────────────────────────────────
function BudgetChallengeView({ styles, settings, onEnd, quit }: any) {
  const { theme } = useTheme();
  const [profile] = useState(() => getRandomBudgetProfile());
  const [alloc, setAlloc] = useState({ necessities: 33, wants: 33, savings: 34 });
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);

  function handleSlider(key: keyof typeof alloc, val: number) {
    const newV = Math.round(val);
    let diff = newV - alloc[key];
    const others = (Object.keys(alloc) as (keyof typeof alloc)[]).filter(k => k !== key) as (keyof typeof alloc)[];
    
    let o1 = alloc[others[0]];
    let o2 = alloc[others[1]];
    
    while (diff > 0 && (o1 > 0 || o2 > 0)) {
      if (o1 >= o2 && o1 > 0) { o1--; diff--; }
      else if (o2 > 0) { o2--; diff--; }
    }
    while (diff < 0 && (o1 + o2 < 100)) {
      if (o1 <= o2) { o1++; diff++; }
      else { o2++; diff++; }
    }
    
    setAlloc({ ...alloc, [key]: newV, [others[0]]: o1, [others[1]]: o2 });
  }

  if (done) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card gradient={theme.colors.heroGradient} glow>
          <Text style={styles.heroTitle}>Evaluasi Budget</Text>
          <Text style={styles.bigScore}>{score} pts</Text>
          <Text style={styles.heroSub}>{getBudgetFeedback(score)}</Text>
        </Card>
        <Card style={styles.menuCard}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.menuTitle}>Alokasi Kamu vs Ideal:</Text>
            <Text style={styles.menuDesc}>Kebutuhan: {alloc.necessities}% (Ideal: {profile.minAllocations.necessities}%)</Text>
            <Text style={styles.menuDesc}>Keinginan: {alloc.wants}% (Ideal: {profile.minAllocations.wants}%)</Text>
            <Text style={styles.menuDesc}>Tabungan: {alloc.savings}% (Ideal: {profile.minAllocations.savings}%)</Text>
          </View>
        </Card>
        <View style={styles.rowBtns}>
          <TouchableOpacity style={styles.nextBtn} onPress={quit}><Text style={styles.nextText}>Selesai</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card style={styles.qCard}>
        <Text style={styles.menuTitle}>{profile.name}</Text>
        <Text style={[styles.heroSub, { color: theme.colors.textPrimary }]}>{profile.description}</Text>
        <Text style={[styles.menuTitle, { color: theme.colors.success, marginTop: 8 }]}>Gaji: {formatRupiah(profile.income)}</Text>
      </Card>
      
      <Text style={styles.menuDesc}>Geser slider agar total 100% dan mendekati aturan ideal profil ini.</Text>
      
      {(['necessities', 'wants', 'savings'] as const).map(k => {
        const labels = { necessities: 'Kebutuhan Pokok (Sewa, Makan)', wants: 'Keinginan (Hiburan, Jajan)', savings: 'Tabungan & Investasi' };
        const colors = { necessities: theme.colors.info, wants: theme.colors.warning, savings: theme.colors.success };
        return (
          <Card key={k} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.menuTitle}>{labels[k]}</Text>
              <Text style={[styles.menuTitle, { color: colors[k] }]}>{alloc[k]}%</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={100}
              value={alloc[k]}
              onValueChange={(v) => handleSlider(k, v)}
              minimumTrackTintColor={colors[k]}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={colors[k]}
            />
            <Text style={styles.meta}>{formatRupiah((alloc[k] / 100) * profile.income)}</Text>
          </Card>
        );
      })}

      <TouchableOpacity style={[styles.nextBtn, { marginTop: 16 }]} onPress={() => {
        hapticLight();
        const sc = calculateBudgetScore(profile, alloc);
        setScore(sc);
        setDone(true);
        onEnd(sc);
      }}>
        <Text style={styles.nextText}>Kunci Jawaban</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stats View
// ─────────────────────────────────────────────────────────────────
function StatsView({ styles, state, quit }: any) {
  const { theme } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card gradient={theme.colors.heroGradient} glow>
        <Text style={styles.heroTitle}>Statistik Pemain</Text>
        <Text style={styles.bigScore}>{state.totalXp} XP</Text>
        <Text style={styles.heroSub}>Level {state.level} • {state.unlockedBadges.length} Badge</Text>
      </Card>
      
      <Text style={styles.menuTitle}>Rekor Terbaik</Text>
      <View style={styles.statGrid}>
        <View style={styles.statMini}><Text style={styles.statMiniLabel}>Kuis</Text><Text style={[styles.statMiniValue, { color: theme.colors.warning }]}>{state.quizBest}</Text></View>
        <View style={styles.statMini}><Text style={styles.statMiniLabel}>Harga</Text><Text style={[styles.statMiniValue, { color: theme.colors.info }]}>{state.priceBest}</Text></View>
        <View style={styles.statMini}><Text style={styles.statMiniLabel}>Survival</Text><Text style={[styles.statMiniValue, { color: theme.colors.danger }]}>{formatRupiah(state.survivalBest)}</Text></View>
      </View>
      <View style={[styles.statGrid, { marginTop: 8 }]}>
        <View style={styles.statMini}><Text style={styles.statMiniLabel}>Data</Text><Text style={[styles.statMiniValue, { color: theme.colors.success }]}>{state.dataBest}</Text></View>
        <View style={styles.statMini}><Text style={styles.statMiniLabel}>Journey</Text><Text style={[styles.statMiniValue, { color: '#8B5CF6' }]}>{state.journeyBest}</Text></View>
        <View style={styles.statMini}><Text style={styles.statMiniLabel}>Budget</Text><Text style={[styles.statMiniValue, { color: '#10B981' }]}>{state.budgetBest}</Text></View>
      </View>

      <Text style={[styles.menuTitle, { marginTop: 16 }]}>Aktivitas</Text>
      <Card style={styles.menuCard}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.menuDesc}>Total Main Kuis: {state.quizCount}x</Text>
          <Text style={styles.menuDesc}>Total Main Harga: {state.priceCount}x</Text>
          <Text style={styles.menuDesc}>Total Main Survival: {state.survivalCount}x</Text>
          <Text style={styles.menuDesc}>Total Main Journey: {state.journeyCount}x</Text>
          <Text style={styles.menuDesc}>Total Main Data: {state.dataCount}x</Text>
          <Text style={styles.menuDesc}>Total Main Budget: {state.budgetCount}x</Text>
          <Text style={styles.menuDesc}>Streak Harian: {state.dailyChallengeStreak} hari</Text>
        </View>
      </Card>
      <TouchableOpacity style={[styles.nextBtn, { marginTop: 8 }]} onPress={quit}><Text style={styles.nextText}>Kembali</Text></TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shop View
// ─────────────────────────────────────────────────────────────────
function ShopView({ styles, state, onBuy, quit }: any) {
  const { theme } = useTheme();
  
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card gradient={theme.colors.heroGradient} glow>
        <Text style={styles.heroTitle}>Toko Arena</Text>
        <Text style={styles.bigScore}>{state.coins} 🪙</Text>
        <Text style={styles.heroSub}>Tukarkan koinmu dengan keuntungan di dalam game!</Text>
      </Card>
      
      {SHOP_ITEMS.map(item => {
        const owned = state.shopPurchases.includes(item.id);
        const count = state.shopPurchases.filter((id: string) => id === item.id).length;
        const canBuy = state.coins >= item.price;
        return (
          <Card key={item.id} style={[styles.menuCard, { marginTop: 8 }]}>
            <View style={[styles.iconBg, { backgroundColor: theme.colors.surfaceCard }]}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.name} {item.type === 'consumable' && count > 0 ? `(x${count})` : ''}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
              <Text style={[styles.bestText, { color: canBuy ? theme.colors.warning : theme.colors.danger }]}>Harga: {item.price} 🪙</Text>
            </View>
            {item.type === 'theme' && owned ? (
              <Text style={[styles.meta, { color: theme.colors.success }]}>Aktif</Text>
            ) : (
              <TouchableOpacity
                disabled={!canBuy}
                style={[styles.diffChip, { backgroundColor: canBuy ? theme.colors.primary : theme.colors.border }]}
                onPress={() => { hapticLight(); onBuy(item.price, item.id); }}
              >
                <Text style={styles.diffChipText}>Beli</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}
      <TouchableOpacity style={[styles.nextBtn, { marginTop: 16 }]} onPress={quit}><Text style={styles.nextText}>Kembali</Text></TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Adventure View (Petualangan Kota)
// ─────────────────────────────────────────────────────────────────
function AdventureView({ styles, settings, onEnd, quit }: any) {
  const { theme } = useTheme();
  const [episode, setEpisode] = useState<AdventureEpisode | null>(null);
  const [locIdx, setLocIdx] = useState(0);
  const [balance, setBalance] = useState(0);
  const [phase, setPhase] = useState<'pick' | 'walking' | 'arriving' | 'event' | 'result' | 'done'>('pick');
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [wiseCount, setWiseCount] = useState(0);
  const bobAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(-150)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current; // Ground
  const skyAnim = useRef(new Animated.Value(0)).current;      // Sky/Clouds
  const horizonAnim = useRef(new Animated.Value(0)).current;  // Skyline/Trees
  const destAnim = useRef(new Animated.Value(300)).current;   // Destination Icon sliding from right
  const cardScaleAnim = useRef(new Animated.Value(0)).current; // Event Card popping up
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [displayScore, setDisplayScore] = useState(0);
  const [dots, setDots] = useState('');

  // Pulsing Map Node Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // Walking bobbing & parallax animation
  useEffect(() => {
    if (phase !== 'walking') return;
    
    // Reset values for a new walk
    bobAnim.setValue(0);
    moveAnim.setValue(-150);
    wobbleAnim.setValue(0);
    parallaxAnim.setValue(0);
    skyAnim.setValue(0);
    horizonAnim.setValue(0);
    destAnim.setValue(400); // Start off-screen right
    cardScaleAnim.setValue(0);

    const walkAnim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bobAnim, { toValue: -15, duration: 250, useNativeDriver: true }),
          Animated.timing(bobAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(wobbleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: -1, duration: 250, useNativeDriver: true }),
        ])
      ])
    );
    
    // Parallax Loops (moving left)
    const roadAnim = Animated.loop(Animated.timing(parallaxAnim, { toValue: -100, duration: 400, useNativeDriver: true }));
    const horizAnim = Animated.loop(Animated.timing(horizonAnim, { toValue: -100, duration: 1500, useNativeDriver: true }));
    const cloudAnim = Animated.loop(Animated.timing(skyAnim, { toValue: -100, duration: 4000, useNativeDriver: true }));

    // Character entrance
    Animated.timing(moveAnim, { toValue: 0, duration: 1000, useNativeDriver: true }).start();

    walkAnim.start();
    roadAnim.start();
    horizAnim.start();
    cloudAnim.start();
    
    const dotsInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    
    // Switch to arriving phase after walking for a while
    const timer = setTimeout(() => { 
      setPhase('arriving'); 
    }, 2000);
    
    return () => { walkAnim.stop(); roadAnim.stop(); horizAnim.stop(); cloudAnim.stop(); clearInterval(dotsInterval); clearTimeout(timer); };
  }, [phase, locIdx]);

  // Arriving Phase (Destination slides in, character stops, then Event pops up)
  useEffect(() => {
    if (phase !== 'arriving') return;
    
    // Stop the bobbing and background loops (let them freeze in place)
    // We animate the destination icon sliding in from 400 to 80 (in front of character)
    Animated.timing(destAnim, {
      toValue: 80,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      // Once destination arrives, spring the card up
      setPhase('event');
      Animated.spring(cardScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });

  }, [phase]);

  // Score Ticker Animation
  useEffect(() => {
    if (phase === 'done') {
      const finalScore = wiseCount * 200;
      let current = 0;
      const step = Math.max(1, Math.floor(finalScore / 40));
      const interval = setInterval(() => {
        current += step;
        if (current >= finalScore) {
          setDisplayScore(finalScore);
          clearInterval(interval);
        } else {
          setDisplayScore(current);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase, wiseCount]);

  function startEpisode(ep: AdventureEpisode) {
    setEpisode(ep);
    setBalance(ep.startBalance);
    setLocIdx(0);
    setWiseCount(0);
    setPicked(null);
    setPhase('walking');
  }

  function choose(idx: 0 | 1) {
    if (!episode) return;
    const choice = episode.locations[locIdx].choices[idx];
    setPicked(idx);
    setBalance(b => b + choice.effect);
    if (choice.isWise) {
      setWiseCount(w => w + 1);
      hapticSuccess();
    } else {
      hapticError();
    }
    setPhase('result');
  }

  function nextLoc() {
    if (!episode) return;
    if (locIdx + 1 >= episode.locations.length) {
      setPhase('done');
      onEnd(wiseCount * 200);
    } else {
      setLocIdx(i => i + 1);
      setPicked(null);
      setPhase('walking');
    }
  }

  // Helper to render the Node Map (used in multiple phases)
  const renderMapNodes = () => {
    if (!episode) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        {episode.locations.map((l, i) => {
          const isPast = i < locIdx;
          const isCurrent = i === locIdx;
          const nodeColor = isPast ? theme.colors.success : isCurrent ? theme.colors.primary : theme.colors.border;
          
          return (
            <React.Fragment key={l.id}>
              <Animated.View style={{ 
                width: 32, height: 32, borderRadius: 16, 
                backgroundColor: isPast ? theme.colors.success + '40' : isCurrent ? theme.colors.primary : theme.colors.border,
                borderWidth: isCurrent ? 2 : 0,
                borderColor: theme.colors.primary,
                justifyContent: 'center', alignItems: 'center',
                transform: isCurrent ? [{ scale: pulseAnim }] : []
              }}>
                <Text style={{ fontSize: isCurrent ? 16 : 12 }}>{isPast ? '✓' : isCurrent ? l.icon : '🔒'}</Text>
              </Animated.View>
              {/* Connection Line */}
              {i < episode.locations.length - 1 && (
                <View style={{ width: 12, height: 4, backgroundColor: isPast ? theme.colors.success : theme.colors.border, marginHorizontal: 2 }} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // Episode Gradients
  const bgGradients: Record<string, [string, string]> = {
    payday: ['#0ea5e9', '#38bdf8'], // Morning Blue
    weekend: ['#f59e0b', '#fbbf24'], // Sunny Yellow
    newmonth: ['#6366f1', '#818cf8'], // Twilight Purple
  };

  // ── Episode Picker ──
  if (phase === 'pick') {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.heroTitle, { color: theme.colors.textPrimary, fontSize: 22 }]}>🗺️ Pilih Petualangan</Text>
        <Text style={styles.menuDesc}>Jelajahi kota dan hadapi keputusan keuangan nyata!</Text>
        {ADVENTURE_EPISODES.map(ep => (
          <TouchableOpacity key={ep.id} onPress={() => startEpisode(ep)}>
            <Card style={styles.menuCard}>
              <View style={[styles.iconBg, { backgroundColor: '#F59E0B20' }]}>
                <Text style={{ fontSize: 28 }}>{ep.character}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{ep.icon} {ep.title}</Text>
                <Text style={styles.menuDesc}>{ep.desc}</Text>
                <Text style={styles.bestText}>Saldo awal: {formatRupiah(ep.startBalance)} • {ep.locations.length} lokasi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Card>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.ghostBtn} onPress={quit}><Text style={styles.ghostText}>Kembali</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  if (!episode) return null;
  const loc = episode.locations[locIdx];
  const choice = picked !== null ? loc.choices[picked] : null;

  // ── Diorama Engine (Walking, Arriving, Event, Result) ──
  const isDiorama = phase === 'walking' || phase === 'arriving' || phase === 'event' || phase === 'result';
  if (isDiorama) {
    const activeGradient = bgGradients[episode.id] || ['#3b82f6', '#60a5fa'];
    const horizonEmojis = episode.id === 'weekend' ? ['🌲', '⛰️', '🌲', '🏕️', '🌲', '⛰️'] : ['🏢', '🏦', '🏨', '🏬', '🏢', '🏦'];
    const isResult = phase === 'result';
    const resultBg = isResult && choice ? (choice.isWise ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)') : 'transparent';

    return (
      <LinearGradient colors={activeGradient} style={styles.container}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
            {renderMapNodes()}

            <View style={{ height: 260, width: '100%', justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              {/* Sky / Clouds Layer */}
              <Animated.View style={{ position: 'absolute', top: 20, left: 0, flexDirection: 'row', transform: [{ translateX: skyAnim }] }}>
                {Array.from({ length: 8 }).map((_, i) => <Text key={i} style={{ fontSize: 40, opacity: 0.6, marginRight: 60 }}>☁️</Text>)}
              </Animated.View>

              {/* Horizon Layer */}
              <Animated.View style={{ position: 'absolute', bottom: 50, left: 0, flexDirection: 'row', transform: [{ translateX: horizonAnim }] }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={{ flexDirection: 'row' }}>
                    {horizonEmojis.map((emoji, j) => <Text key={j} style={{ fontSize: 50, opacity: 0.8, marginRight: 20 }}>{emoji}</Text>)}
                  </View>
                ))}
              </Animated.View>

              {/* Ground Parallax */}
              <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: -400, flexDirection: 'row', transform: [{ translateX: parallaxAnim }] }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <View key={i} style={{ width: 80, alignItems: 'center', justifyContent: 'flex-end', height: 40 }}>
                    <Text style={{ fontSize: 18, opacity: 0.5, marginBottom: 4 }}>👣</Text>
                    <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                  </View>
                ))}
              </Animated.View>

              {/* Destination Icon Layer (Slides in during Arriving) */}
              <Animated.View style={{ position: 'absolute', bottom: 30, transform: [{ translateX: destAnim }] }}>
                <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 20, borderWidth: 3, borderColor: theme.colors.primary, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }}>
                  <Text style={{ fontSize: 48 }}>{loc.icon}</Text>
                </View>
              </Animated.View>

              {/* Actor Layer (Character) */}
              <Animated.View style={{ 
                zIndex: 10,
                transform: [
                  { translateX: moveAnim }, 
                  { translateY: bobAnim },
                  { rotate: wobbleAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] }) }
                ],
                marginBottom: 20
              }}>
                <Text style={{ fontSize: 96, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 8 }}>
                  {episode.character}
                </Text>
              </Animated.View>

              {/* Result Overlay Glow */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: resultBg, pointerEvents: 'none' }} />
            </View>

            {/* Status / UI Cards */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={[styles.meta, { color: theme.colors.textPrimary }]}>Menuju {loc.name}</Text>
              </View>
              <View style={{ backgroundColor: theme.colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={[styles.meta, { color: '#fff', fontWeight: 'bold' }]}>{formatRupiah(balance)}</Text>
              </View>
            </View>

            {/* Event Card (Springs up) */}
            {(phase === 'event' || phase === 'result') && (
              <Animated.View style={{ transform: [{ scale: cardScaleAnim }], marginTop: 20 }}>
                <Card style={[styles.qCard, { borderColor: theme.colors.primary, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                  <Text style={[styles.menuTitle, { fontSize: 20, textAlign: 'center' }]}>{loc.name}</Text>
                  <Text style={[styles.menuDesc, { textAlign: 'center', fontSize: 15, marginTop: 4 }]}>{loc.desc}</Text>
                </Card>

                {/* Choices (Arcade 3D Buttons) */}
                {phase === 'event' && (
                  <View style={{ gap: 16, marginTop: 16 }}>
                    {loc.choices.map((c, i) => (
                      <TouchableOpacity key={i} onPress={() => choose(i as 0 | 1)} activeOpacity={0.7} style={{
                        backgroundColor: i === 0 ? theme.colors.primary : '#6b7280',
                        borderRadius: 16,
                        paddingBottom: 6, // 3D Bottom Lip
                      }}>
                        <View style={{ backgroundColor: i === 0 ? '#60a5fa' : '#9ca3af', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{c.label}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 }}>{formatRupiah(c.effect)}</Text>
                          </View>
                          <Ionicons name="chevron-forward-circle" size={28} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Result Glow Card */}
                {phase === 'result' && choice && (
                  <Card style={[styles.tipCard, { marginTop: 16, borderColor: choice.isWise ? theme.colors.success : theme.colors.danger, borderWidth: 2, backgroundColor: '#fff' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: choice.isWise ? theme.colors.success : theme.colors.danger, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={choice.isWise ? "checkmark" : "close"} size={24} color="#fff" />
                      </View>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: choice.isWise ? theme.colors.success : theme.colors.danger }}>
                        {choice.isWise ? 'Keputusan Bijak!' : 'Kurang Bijak'}
                      </Text>
                    </View>
                    <Text style={[styles.tipText, { textAlign: 'center', fontSize: 15 }]}>{choice.message}</Text>
                    
                    <View style={{ backgroundColor: theme.colors.background, padding: 16, borderRadius: 12, marginTop: 16, borderLeftWidth: 4, borderLeftColor: theme.colors.info }}>
                      <Text style={[styles.meta, { color: theme.colors.info, fontWeight: 'bold' }]}>💡 Tips Keuangan:</Text>
                      <Text style={[styles.meta, { marginTop: 4, fontSize: 13, lineHeight: 20 }]}>{choice.tip}</Text>
                    </View>
                    
                    <TouchableOpacity style={[styles.nextBtn, { marginTop: 20 }]} onPress={nextLoc}>
                      <Text style={styles.nextText}>{locIdx + 1 >= episode.locations.length ? '📊 Lihat Hasil Akhir' : '🚶 Lanjut Perjalanan'}</Text>
                    </TouchableOpacity>
                  </Card>
                )}
              </Animated.View>
            )}

            {/* Walking Indicator text */}
            {phase === 'walking' && (
              <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginTop: 20, fontSize: 16, fontWeight: 'bold' }}>
                Sedang di jalan{dots}
              </Text>
            )}
            
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  // ── Done Screen ──
  if (phase === 'done') {
    const pct = Math.round((balance / episode.startBalance) * 100);
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card gradient={theme.colors.heroGradient} glow style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 64 }}>{episode.character}</Text>
          <Text style={[styles.heroTitle, { fontSize: 28 }]}>Petualangan Selesai!</Text>
          <Text style={[styles.bigScore, { fontSize: 56, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 4 }]}>
            {displayScore} pts
          </Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 10 }}>
            <Text style={styles.heroSub}>Keputusan bijak: {wiseCount} / {episode.locations.length} ✅</Text>
          </View>
        </Card>
        
        <Card style={{ gap: 12 }}>
          <Text style={styles.menuTitle}>📊 Laporan Keuangan</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.menuDesc}>Saldo Awal</Text>
            <Text style={styles.menuDesc}>{formatRupiah(episode.startBalance)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.menuDesc}>Saldo Akhir</Text>
            <Text style={[styles.menuTitle, { fontSize: 18, color: pct >= 50 ? theme.colors.success : theme.colors.danger }]}>{formatRupiah(balance)}</Text>
          </View>
          <View style={[styles.timerTrack, { height: 12, borderRadius: 6 }]}>
            <View style={[styles.timerFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 50 ? theme.colors.success : theme.colors.danger, borderRadius: 6 }]} />
          </View>
          <Text style={[styles.meta, { textAlign: 'center', fontWeight: 'bold' }]}>Sisa {pct}% dari saldo awal</Text>
        </Card>
        <TouchableOpacity style={styles.nextBtn} onPress={quit}><Text style={styles.nextText}>Selesai</Text></TouchableOpacity>
      </ScrollView>
    );
  }

}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, fontSize: 20 },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: 40 },
  play: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  diffChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.radius.round },
  diffChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bigScore: { fontSize: 40, fontWeight: '800', color: '#fff', marginVertical: 4 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  iconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  menuTitle: { ...theme.typography.body, fontWeight: '700', fontSize: 15 },
  menuDesc: { ...theme.typography.caption, fontSize: 12 },
  bestText: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.warning, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { ...theme.typography.caption, fontWeight: '700', fontSize: 12 },
  timerTrack: { height: 8, borderRadius: 4, backgroundColor: theme.colors.track, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 4 },
  qCard: { gap: 8, alignItems: 'center' },
  qText: { ...theme.typography.body, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  opt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surfaceCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  optText: { ...theme.typography.body, fontWeight: '600', flex: 1 },
  optRight: { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '15' },
  optWrong: { borderColor: theme.colors.danger, backgroundColor: theme.colors.danger + '15' },
  tipCard: { gap: 10 },
  tipText: { ...theme.typography.bodySmall, fontSize: 13 },
  nextBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: theme.spacing.md, alignItems: 'center', flex: 1 },
  nextText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  ghostBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.md, alignItems: 'center', flex: 1 },
  ghostText: { color: theme.colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  rowBtns: { flexDirection: 'row', gap: 10 },
  balBar: { height: 10, width: '100%', borderRadius: 5, backgroundColor: theme.colors.track, overflow: 'hidden' },
  balFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 5 },
  logRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  logText: { ...theme.typography.caption, fontSize: 12 },
  badgeItem: { alignItems: 'center', justifyContent: 'center' },
  badgeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
  badgePopup: { width: '100%', maxWidth: 400, gap: 16, alignItems: 'center', padding: 24 },
  badgePopupItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: theme.colors.background, padding: 12, borderRadius: 12, width: '100%' },
  statGrid: { flexDirection: 'row', gap: 8 },
  statMini: { flex: 1, backgroundColor: theme.colors.surfaceCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 8, alignItems: 'center' },
  statMiniLabel: { ...theme.typography.caption, fontSize: 10, fontWeight: '700' },
  statMiniValue: { fontSize: 12, fontWeight: '800' },
});

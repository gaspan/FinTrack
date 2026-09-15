import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext, SQLiteDatabase } from 'expo-sqlite';
import { useBook } from '@/constants/books';
import { useTheme, type Theme } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/utils/format';
import { hapticError, hapticLight, hapticSuccess } from '@/utils/haptic';
import { PRICE_ITEMS, QUIZ_QUESTIONS, SURVIVAL_EVENTS, rankFor, shuffle, ACHIEVEMENTS, Achievement } from '@/features/game/data';
import { GameState, loadGameState, saveGameState, checkAchievements, getLevelProgress } from '@/features/game/gameStore';
import { generateDataQuestions, DataQuestion } from '@/features/game/dataChallenge';

type Mode = 'menu' | 'quiz' | 'price' | 'survival' | 'data';
const QUIZ_TIME = 15;
const ROUNDS = 10;

export default function GamePage() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const db = useSQLiteContext();
  const { activeBook } = useBook();
  const bookId = activeBook?.id ?? 1;

  const [mode, setMode] = useState<Mode>('menu');
  const [state, setState] = useState<GameState | null>(null);
  const [newBadges, setNewBadges] = useState<Achievement[]>([]);

  useEffect(() => {
    loadGameState().then(setState);
  }, []);

  const handleGameEnd = useCallback(async (mode: Mode, score: number, isPerfect: boolean) => {
    if (!state) return;
    
    // XP Calculation
    const xpEarned = Math.floor(score * 0.5); // 1 XP per 2 score points
    
    const nextState = { ...state };
    nextState.totalXp += xpEarned;
    if (!nextState.modesPlayed.includes(mode)) nextState.modesPlayed.push(mode);
    
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
    } else if (mode === 'data') {
      nextState.dataCount += 1;
      nextState.dataBest = Math.max(state.dataBest, score);
      if (isPerfect) nextState.dataPerfect = true;
    }

    // Check level & achievements
    const achCheck = checkAchievements(nextState);
    if (achCheck.newlyUnlocked.length > 0) {
      setNewBadges(achCheck.newlyUnlocked);
    }
    
    await saveGameState(achCheck.newState);
    setState(achCheck.newState);
    
    return { xpEarned, newlyUnlocked: achCheck.newlyUnlocked };
  }, [state]);

  const clearBadges = () => setNewBadges([]);

  if (!state) return null; // Loading

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (mode === 'menu' ? router.back() : setMode('menu'))} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arena Finansial</Text>
        <View style={{ width: 40 }} />
      </View>

      {mode === 'menu' && <MenuView styles={styles} state={state} go={setMode} />}
      {mode === 'quiz' && <QuizView styles={styles} onEnd={(score, streak) => {
        if (state && streak > state.maxStreak) {
          state.maxStreak = streak; // update streak before saving
        }
        return handleGameEnd('quiz', score, false);
      }} quit={() => setMode('menu')} />}
      
      {mode === 'price' && <PriceView styles={styles} onEnd={(score, perfect) => handleGameEnd('price', score, perfect)} quit={() => setMode('menu')} />}
      
      {mode === 'survival' && <SurvivalView styles={styles} onEnd={(score) => handleGameEnd('survival', score, false)} quit={() => setMode('menu')} />}
      
      {mode === 'data' && <DataChallengeView styles={styles} db={db} bookId={bookId} onEnd={(score, perfect) => handleGameEnd('data', score, perfect)} quit={() => setMode('menu')} />}
      
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

function MenuView({ styles, state, go }: { styles: any, state: GameState, go: (m: Mode) => void }) {
  const { theme } = useTheme();
  const { current, next, progress } = getLevelProgress(state);
  
  const items = [
    { mode: 'data', icon: 'analytics-outline', color: '#E11D48', title: 'Tantangan Data Asli', desc: 'Uji wawasan dari catatan pengeluaranmu sendiri.', best: state.dataBest },
    { mode: 'quiz', icon: 'bulb-outline', color: theme.colors.warning, title: 'Kuis Cerdas Finansial', desc: '10 soal literasi keuangan, 15 detik/soal.', best: state.quizBest },
    { mode: 'price', icon: 'pricetag-outline', color: theme.colors.info, title: 'Tebak Harga Pasar', desc: 'Asah feeling harga biar tak overbudget.', best: state.priceBest },
    { mode: 'survival', icon: 'wallet-outline', color: theme.colors.success, title: 'Survival Gajian 3 Jt', desc: 'Bertahan 10 kejadian sebulan penuh.', best: state.survivalBest },
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

function QuizView({ styles, onEnd, quit }: { styles: any, onEnd: (score: number, streak: number) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  // Transform questions to shuffle options immediately
  const [qs] = useState(() => {
    const selected = shuffle(QUIZ_QUESTIONS).slice(0, ROUNDS);
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
  const [left, setLeft] = useState(QUIZ_TIME);
  const q = qs[idx];

  useEffect(() => {
    if (done || picked !== null) return;
    if (left <= 0) {
      const t = setTimeout(() => pick(-1), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, picked, done]);

  function pick(i: number) {
    if (picked !== null || done) return;
    setPicked(i);
    if (i === q.answer) {
      const pts = 100 + left * 5 + (streak >= 2 ? 50 : 0);
      setScore(s => s + pts);
      setStreak(s => s + 1);
      hapticSuccess();
    } else {
      setStreak(0);
      hapticError();
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
      setLeft(QUIZ_TIME);
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
      <TimerBar secs={QUIZ_TIME} left={left} styles={styles} />
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
          <Text style={styles.tipText}>{picked === q.answer ? 'Benar! ' : picked === -1 ? 'Waktu habis! ' : 'Kurang tepat. '}{q.tip}</Text>
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

function PriceView({ styles, onEnd, quit }: { styles: any, onEnd: (score: number, perfect: boolean) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  const [items] = useState(() => shuffle(PRICE_ITEMS).slice(0, ROUNDS));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [endResult, setEndResult] = useState<any>(null);
  const [left, setLeft] = useState(QUIZ_TIME);
  const item = items[idx];
  
  // Deduplicate and randomize options
  const options = useMemo(() => {
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
  }, [item.price]);

  useEffect(() => {
    if (done || picked !== null) return;
    if (left <= 0) {
      const t = setTimeout(() => pick(-1), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, picked, done]);

  function pick(v: number) {
    if (picked !== null || done) return;
    setPicked(v);
    if (v === item.price) {
      setScore(s => s + 100 + left * 5);
      setCorrectCount(c => c + 1);
      hapticSuccess();
    } else hapticError();
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
      setLeft(QUIZ_TIME);
    }
  }

  if (done) return <ResultView styles={styles} score={score} result={endResult} title="Tebakan Selesai!" quit={quit} unit="pts" rank={rankFor(score)} />;

  return (
    <View style={styles.play}>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Ronde {idx + 1}/{items.length}</Text>
        <Text style={styles.meta}>Skor {score}</Text>
        <Text style={styles.meta}>{left}s</Text>
      </View>
      <TimerBar secs={QUIZ_TIME} left={left} styles={styles} />
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
          <Text style={styles.tipText}>{picked === item.price ? 'Tepat! ' : `Harga benar ${formatRupiah(item.price)}. `}{item.tip}</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextText}>{idx + 1 >= items.length ? 'Lihat Hasil' : 'Lanjut'}</Text>
          </TouchableOpacity>
        </Card>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Survival View
// ─────────────────────────────────────────────────────────────────

function SurvivalView({ styles, onEnd, quit }: { styles: any, onEnd: (score: number) => Promise<any>, quit: () => void }) {
  const { theme } = useTheme();
  // Randomize 10 events
  const [events] = useState(() => shuffle(SURVIVAL_EVENTS).slice(0, 10));
  const [idx, setIdx] = useState(0);
  const [balance, setBalance] = useState(3000000);
  const [saved, setSaved] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [lastNote, setLastNote] = useState<string | null>(null);
  const [endResult, setEndResult] = useState<any>(null);
  const ev = events[idx];

  async function choose(side: 'a' | 'b') {
    hapticLight();
    const eff = side === 'a' ? ev.aEffect : ev.bEffect;
    const note = side === 'a' ? ev.aNote : ev.bNote;
    const nb = balance + eff;
    if (idx === 0 && side === 'a' && eff === -600000) setSaved(600000);
    setBalance(nb);
    setLastNote(note);
    setLog((l) => [...l, `${ev.day}: ${ev.title} (${eff >= 0 ? '+' : ''}${formatRupiah(eff)})`]);
    
    if (nb < 0) {
      setDone(true);
      setEndResult(await onEnd(0));
      return;
    }
    if (idx + 1 >= events.length) {
      setDone(true);
      setEndResult(await onEnd(nb));
    } else {
      setIdx((v) => v + 1);
    }
  }

  function restart() {
    setIdx(0); setBalance(3000000); setSaved(0); setLog([]); setDone(false); setLastNote(null);
  }

  if (done) {
    const grade = balance <= 0 ? 'Bangkrut! Coba lagi.' : balance >= 2200000 ? 'Sultan Bertahan!' : balance >= 1200000 ? 'Hemat Mantap!' : 'Pas-pasan!';
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card gradient={theme.colors.heroGradient} glow>
          <Text style={styles.heroTitle}>{grade}</Text>
          <Text style={styles.heroSub}>Sisa saldo: {formatRupiah(Math.max(0, balance))}</Text>
          {endResult?.xpEarned > 0 && <Text style={styles.heroSub}>+{endResult.xpEarned} XP Earned!</Text>}
        </Card>
        {log.map((l, i) => (
          <View key={i} style={styles.logRow}><Text style={styles.logText}>{l}</Text></View>
        ))}
        <View style={styles.rowBtns}>
          {/* <TouchableOpacity style={styles.nextBtn} onPress={restart}><Text style={styles.nextText}>Main Lagi</Text></TouchableOpacity> */}
          <TouchableOpacity style={styles.ghostBtn} onPress={quit}><Text style={styles.ghostText}>Menu Game</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card style={styles.qCard}>
        <Text style={styles.meta}>Event {idx+1}/{events.length} • Saldo {formatRupiah(balance)}</Text>
        <View style={styles.balBar}>
          <View style={[styles.balFill, { width: `${Math.max(0, Math.min(100, (balance / 3000000) * 100))}%` }]} />
        </View>
        <Text style={styles.qText}>{ev.title}</Text>
        <Text style={styles.menuDesc}>{ev.desc}</Text>
        {lastNote && <Text style={styles.tipText}>{lastNote}</Text>}
      </Card>
      <TouchableOpacity style={styles.opt} onPress={() => choose('a')}>
        <Text style={styles.optText}>{ev.aLabel}</Text>
        <Text style={styles.menuDesc}>{formatRupiah(ev.aEffect)}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.opt} onPress={() => choose('b')}>
        <Text style={styles.optText}>{ev.bLabel}</Text>
        <Text style={styles.menuDesc}>{formatRupiah(ev.bEffect)}</Text>
      </TouchableOpacity>
      {saved > 0 && <Text style={styles.bestText}>Tabungan diamankan: {formatRupiah(saved)}</Text>}
    </ScrollView>
  );
}


// ─────────────────────────────────────────────────────────────────
// Data Challenge View
// ─────────────────────────────────────────────────────────────────

function DataChallengeView({ styles, db, bookId, onEnd, quit }: { styles: any, db: SQLiteDatabase, bookId: number, onEnd: (score: number, perfect: boolean) => Promise<any>, quit: () => void }) {
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
      // Pick up to 10 random questions
      const selected = shuffle(questions).slice(0, 10);
      setQs(selected);
      setLoading(false);
    });
  }, [db, bookId]);

  function pick(i: number) {
    if (picked !== null || done) return;
    setPicked(i);
    if (i === qs[idx].answer) {
      setScore(s => s + 200); // 200 pts for correct data answer
      setCorrectCount(c => c + 1);
      hapticSuccess();
    } else {
      hapticError();
    }
  }

  async function next() {
    hapticLight();
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
          <Text style={styles.tipText}>{picked === q.answer ? 'Benar! ' : 'Kurang tepat. '}{q.tip}</Text>
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

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...theme.typography.h2, fontSize: 20 },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: 40 },
  play: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
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
});

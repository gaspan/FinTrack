import {
  LIFE_STAGES,
  JOURNEY_BACKGROUNDS,
  JOURNEY_EVENTS,
  JOURNEY_RANDOM_EVENTS,
  JOURNEY_ENDINGS,
  JOURNEY_RUN_LENGTH,
  endingFor,
  rankOfEnding,
  scoreJourney,
  pickJourneyRun,
  comboBonus,
  pointsFor,
  WISE_POIN_THRESHOLD,
} from '@/features/game/dataJourney';
import { checkAchievements, GameState } from '@/features/game/gameStore';

const JT = 1000000;

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
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
    survivalMaxTier: 1,
    frugalSurvival: false,
    dataCount: 0,
    dataBest: 0,
    dataPerfect: false,
    journeyCount: 0,
    journeyBest: 0,
    journeyBestEnding: '',
    journeyEndings: [],
    journeyBestNetWorth: 0,
    modesPlayed: [],
    unlockedBadges: [],
    lastPlayDate: null,
    dailyStreak: 0,
    coins: 0,
    dailyChallengeDone: null,
    dailyChallengeStreak: 0,
    shopPurchases: [],
    budgetCount: 0,
    budgetBest: 0,
    fastestCorrectMs: 999999,
    quizPerfect: false,
    adventureCount: 0,
    adventureBest: 0,
    ...overrides,
  };
}

describe('journey content', () => {
  it('has 5 stages and 6 backgrounds', () => {
    expect(LIFE_STAGES).toHaveLength(5);
    expect(JOURNEY_BACKGROUNDS).toHaveLength(6);
  });

  it('has 25 mandatory events (5 per stage) + 20 random events, run stays 18', () => {
    expect(JOURNEY_EVENTS).toHaveLength(25);
    for (let s = 1; s <= 5; s++) {
      expect(JOURNEY_EVENTS.filter((e) => e.stage === s)).toHaveLength(5);
    }
    expect(JOURNEY_RANDOM_EVENTS.length).toBeGreaterThanOrEqual(10);
    expect(JOURNEY_RUN_LENGTH).toBe(18);
    // pickJourneyRun samples 3 per stage + 3 random
    const run = pickJourneyRun();
    expect(run).toHaveLength(18);
  });

  it('every choice has a label, points and an educational note', () => {
    for (const e of [...JOURNEY_EVENTS, ...JOURNEY_RANDOM_EVENTS]) {
      const choices = e.c ? [e.a, e.b, e.c] : [e.a, e.b];
      for (const c of choices) {
        expect(c.label.length).toBeGreaterThan(0);
        expect(c.poin).toBeGreaterThan(0);
        expect(c.note.length).toBeGreaterThan(0);
      }
    }
  });

  it('has boss events and combo helpers', () => {
    expect(JOURNEY_EVENTS.filter((e) => e.isBoss).length).toBeGreaterThanOrEqual(5);
    expect(WISE_POIN_THRESHOLD).toBe(100);
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(3)).toBe(50);
    const boss = JOURNEY_EVENTS.find((e) => e.isBoss)!;
    expect(pointsFor(boss, 100)).toBe(150);
  });
});

describe('endingFor', () => {
  it('maps net worth to the right tier', () => {
    expect(endingFor(-1000, 50).id).toBe('gelandangan');
    expect(endingFor(0, 50).id).toBe('paspasan');
    expect(endingFor(200 * JT, 50).id).toBe('tenang');
    expect(endingFor(1_000 * JT, 50).id).toBe('nyaman');
    expect(endingFor(3_000 * JT, 50).id).toBe('kaya');
    expect(endingFor(10_000 * JT, 50).id).toBe('sultan');
    expect(endingFor(20_000 * JT, 50).id).toBe('legenda');
  });

  it('unlocks secret zen ending when super happy with enough wealth', () => {
    expect(endingFor(1_000 * JT, 95).id).toBe('bahagia_sejati');
  });

  it('bumps one tier up when happy, down when miserable', () => {
    expect(endingFor(1_000 * JT, 80).id).toBe('kaya');
    expect(endingFor(1_000 * JT, 20).id).toBe('tenang');
    // clamped at edges
    expect(endingFor(20_000 * JT, 100).id).toBe('legenda');
    expect(endingFor(-1000, 0).id).toBe('gelandangan');
  });
});

describe('rankOfEnding', () => {
  it('returns 0 for unknown ids', () => {
    expect(rankOfEnding('nope')).toBe(0);
    expect(rankOfEnding('')).toBe(0);
  });

  it('ranks are ordered like JOURNEY_ENDINGS ladder', () => {
    expect(JOURNEY_ENDINGS.map((e) => e.id)).toEqual(
      expect.arrayContaining(['gelandangan', 'legenda', 'bahagia_sejati'])
    );
    expect(rankOfEnding('legenda')).toBe(6);
    expect(rankOfEnding('bahagia_sejati')).toBe(5);
  });
});

describe('scoreJourney', () => {
  it('caps the net-worth bonus at 1000', () => {
    expect(scoreJourney(1800, 5_000 * JT, 80)).toBe(1800 + 1000 + 160);
    expect(scoreJourney(0, 0, 0)).toBe(0);
  });

  it('treats negative net worth as zero bonus', () => {
    expect(scoreJourney(500, -50 * JT, 50)).toBe(500 + 0 + 100);
  });
});

describe('journey achievements', () => {
  it('unlocks journey_first after one run', () => {
    const { newlyUnlocked } = checkAchievements(makeState({ journeyCount: 1 }));
    expect(newlyUnlocked.map((a) => a.id)).toContain('journey_first');
  });

  it('unlocks comfort at nyaman rank and sultan only at top rank', () => {
    const comfort = checkAchievements(makeState({ journeyCount: 1, journeyBestEnding: 'nyaman' }));
    expect(comfort.newlyUnlocked.map((a) => a.id)).toContain('journey_comfort');
    expect(comfort.newlyUnlocked.map((a) => a.id)).not.toContain('journey_sultan');

    const sultan = checkAchievements(makeState({ journeyCount: 1, journeyBestEnding: 'sultan' }));
    expect(sultan.newlyUnlocked.map((a) => a.id)).toContain('journey_sultan');
  });

  it('unlocks legenda, zen, and kolektor achievements', () => {
    const legenda = checkAchievements(makeState({ journeyCount: 1, journeyBestEnding: 'legenda' }));
    expect(legenda.newlyUnlocked.map((a) => a.id)).toContain('journey_legenda');

    const zen = checkAchievements(makeState({ journeyCount: 1, journeyEndings: ['bahagia_sejati'] }));
    expect(zen.newlyUnlocked.map((a) => a.id)).toContain('journey_zen');

    const kolektor = checkAchievements(makeState({ journeyCount: 6, journeyEndings: ['a', 'b', 'c', 'd', 'e', 'f'] }));
    expect(kolektor.newlyUnlocked.map((a) => a.id)).toContain('journey_kolektor');
  });

  it('requires 5 modes for all_modes', () => {
    const four = checkAchievements(makeState({ modesPlayed: ['quiz', 'price', 'survival', 'data'] }));
    expect(four.newlyUnlocked.map((a) => a.id)).not.toContain('all_modes');

    const five = checkAchievements(makeState({ modesPlayed: ['quiz', 'price', 'survival', 'data', 'journey'] }));
    expect(five.newlyUnlocked.map((a) => a.id)).toContain('all_modes');
  });
});

import { QUIZ_QUESTIONS, PRICE_ITEMS, SURVIVAL_EVENTS, shuffle, QuizQuestion, PriceItem, SurvivalEvent } from './data';
import dayjs from 'dayjs';

export interface DailyChallenge {
  dateStr: string;
  quiz: QuizQuestion;
  price: PriceItem;
  survival: SurvivalEvent;
}

// Pseudo-random generator based on date string (YYYY-MM-DD)
function seededRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

function getSeededItem<T>(arr: T[], seedStr: string, offset: number = 0): T {
  const index = Math.floor(seededRandom(seedStr + offset) * arr.length);
  return arr[index];
}

export function getDailyChallenge(): DailyChallenge {
  const dateStr = dayjs().format('YYYY-MM-DD');
  
  // Quiz: Randomize the correct answer options immediately so we get a specific shuffle for the day
  const rawQuiz = getSeededItem(QUIZ_QUESTIONS, dateStr, 1);
  const quizCorrectStr = rawQuiz.options[rawQuiz.answer];
  
  // Use a pseudo-random shuffle for options so they are the same all day
  let opts = [...rawQuiz.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(dateStr + 'opt' + i) * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  
  const quiz = {
    ...rawQuiz,
    options: opts,
    answer: opts.indexOf(quizCorrectStr)
  };

  return {
    dateStr,
    quiz: quiz as QuizQuestion,
    price: getSeededItem(PRICE_ITEMS, dateStr, 2),
    // Exclude chain events from daily challenge for simplicity
    survival: getSeededItem(SURVIVAL_EVENTS.filter(e => !e.chainEvent), dateStr, 3),
  };
}

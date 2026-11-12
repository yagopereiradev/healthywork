import type { BackupData } from '@/data/backup';
import { DEFAULT_SETTINGS, type Settings } from '@/data/settings';
import type { BreakEntry, BreakType, DrinkType, FocusEntry, WaterEntry } from '@/data/types';
import { BREAK_ROTATION } from '@/features/breaks/domain/breaks';
import { addDays, dayKey, dayStart, type DayKey } from '@/lib/dates';

/**
 * Demo mode (?demo=1): the app opens with a month of believable sample data,
 * for recording GIFs and screenshots. It uses its own database, so real data
 * is never touched. The sample data is rebuilt whenever the address asks for
 * demo mode, and once a day.
 */
export const DEMO_DATABASE = 'healthywork-demo';
/** Session key holding the day the sample data was last built. */
export const DEMO_SEEDED_KEY = 'demo-seeded';
const DEMO_FLAG = 'hw-demo';
const HISTORY_DAYS = 30;
const MINUTE = 60_000;

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * `?demo=1` turns demo mode on for this tab and `?demo=0` turns it off. In
 * between it sticks, because moving around the app drops the query string.
 */
export function detectDemoMode(search: string, storage: FlagStorage): boolean {
  try {
    const param = new URLSearchParams(search).get('demo');
    if (param === '1') storage.setItem(DEMO_FLAG, '1');
    if (param === '0') storage.removeItem(DEMO_FLAG);
    return storage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Small seeded generator, so a given day always gets the same sample data. */
function seeded(seed: string): () => number {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** What "today" looks like, as minutes before now. It adds up to 1,250 ml, 3 breaks and 2h55 of focus. */
const TODAY: (
  | { ago: number; water: number; drink: DrinkType }
  | { ago: number; break: BreakType }
  | { ago: number; focusMin: number }
)[] = [
  { ago: 18, water: 250, drink: 'water' },
  { ago: 40, break: 'neck-shoulders' },
  { ago: 92, focusMin: 50 },
  { ago: 137, water: 500, drink: 'water' },
  { ago: 232, break: 'eyes' },
  { ago: 300, focusMin: 50 },
  { ago: 322, water: 500, drink: 'coffee' },
  { ago: 352, break: 'walk' },
  { ago: 390, focusMin: 25 },
  { ago: 452, focusMin: 50 },
];

export function buildDemoData(
  now: number,
  appearance: Settings['appearance'] = DEFAULT_SETTINGS.appearance,
): BackupData {
  const today = dayKey(now);
  const water: WaterEntry[] = [];
  const breaks: BreakEntry[] = [];
  const focus: FocusEntry[] = [];
  let serial = 0;
  const id = () => `demo-${++serial}`;

  const addFocus = (at: number, minutes: number) =>
    focus.push({
      id: id(),
      day: dayKey(at),
      at,
      plannedSec: minutes * 60,
      focusedSec: minutes * 60,
      completed: true,
    });

  for (const item of TODAY) {
    const at = now - item.ago * MINUTE;
    if (dayKey(at) !== today) continue;
    if ('water' in item) {
      water.push({ id: id(), day: today, at, amountMl: item.water, drink: item.drink });
    } else if ('break' in item) {
      breaks.push({
        id: id(),
        day: today,
        at,
        type: item.break,
        durationSec: 300,
        origin: 'reminder',
      });
    } else {
      addFocus(at, item.focusMin);
    }
  }

  for (let offset = 1; offset < HISTORY_DAYS; offset++) {
    const day: DayKey = addDays(today, -offset);
    const start = dayStart(day);
    const random = seeded(day);
    const weekday = start.getDay();
    const workday = weekday >= 1 && weekday <= 5;
    const at = (hour: number) => start.getTime() + Math.round(hour * 60) * MINUTE;
    const between = (from: number, to: number) => from + random() * (to - from);

    if (!workday) {
      if (random() < 0.5) {
        water.push({ id: id(), day, at: at(between(10, 17)), amountMl: 250, drink: 'water' });
      }
      continue;
    }

    // The most recent working days all reach the goal, so the streak has something to show.
    const mustReachGoal = offset <= 8;
    const target = mustReachGoal
      ? 2000 + Math.round(random() * 2) * 250
      : 1250 + Math.round(random() * 5) * 250;
    for (let total = 0, hour = 9.1; total < target; hour += between(0.6, 1.2)) {
      const amountMl = random() < 0.3 ? 500 : 250;
      const drink: DrinkType =
        hour < 10.5 && random() < 0.6 ? 'coffee' : random() < 0.12 ? 'tea' : 'water';
      water.push({ id: id(), day, at: at(Math.min(hour, 18.5)), amountMl, drink });
      total += amountMl;
    }

    const breakCount = 3 + Math.floor(random() * 5);
    for (let index = 0; index < breakCount; index++) {
      breaks.push({
        id: id(),
        day,
        at: at(9.5 + (index * 8) / breakCount + between(0, 0.4)),
        type: BREAK_ROTATION[index % BREAK_ROTATION.length] ?? 'walk',
        durationSec: 300,
        origin: 'reminder',
      });
    }

    const blocks = 3 + Math.floor(random() * 4);
    for (let index = 0; index < blocks; index++) {
      addFocus(at(9.2 + index * 1.4 + between(0, 0.3)), random() < 0.5 ? 50 : 25);
    }
  }

  return {
    settings: { ...DEFAULT_SETTINGS, appearance, onboardingDone: true },
    water,
    breaks,
    focus,
  };
}

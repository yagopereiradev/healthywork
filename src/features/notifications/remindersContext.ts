import { createContext, use } from 'react';
import type { Settings } from '@/data/settings';
import type { BreakType } from '@/data/types';
import type { ReminderContext, ReminderState } from './domain/reminders';

export interface RemindersValue {
  /** The reminder state as of now, and what it was computed from. */
  state: ReminderState;
  context: ReminderContext;
  settings: Settings;

  snoozeBreak: () => Promise<void>;
  skipBreak: () => Promise<void>;
  /** "Done": logs the break that was suggested. */
  completeBreak: () => Promise<void>;
  /**
   * Opens a break now, without waiting for it to come due. `focusBreakMin` is
   * given when it is the break at the end of a focus block.
   */
  startBreakNow: (type: BreakType, focusBreakMin?: number) => Promise<void>;
  /** Pushes the upcoming break 10 minutes further. */
  postponeNextBreak: () => Promise<void>;

  snoozeWater: () => Promise<void>;
  dismissWater: () => Promise<void>;

  startMeeting: (minutes: number | null) => Promise<void>;
  endMeeting: () => Promise<void>;
}

/** Null while data is loading. */
export const RemindersContext = createContext<RemindersValue | null>(null);

export function useReminders(): RemindersValue | null {
  return use(RemindersContext);
}

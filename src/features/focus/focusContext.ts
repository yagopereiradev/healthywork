import { createContext, use } from 'react';
import type { FocusPlan, FocusState } from './domain/timer';

/** Where the running session is kept, in the device's session state. */
export const FOCUS_STATE_KEY = 'focus';

export interface FocusValue {
  /** The session, or null when there is none. */
  state: FocusState | null;
  /** The block that would start now: the session's plan, or the one in settings. */
  plan: FocusPlan;
  /** The block that is running, paused or up next. */
  block: number;

  /** Starts the next block. */
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /** Ends the session, logging what was focused so far. */
  stop: () => Promise<void>;
  /** F: start, pause or resume, whichever makes sense now. */
  toggle: () => Promise<void>;
  /** Chooses the block length. Not available while a block is on the clock. */
  choosePlan: (focusMin: number, breakMin: number) => Promise<void>;
}

/** Null while data is loading. */
export const FocusContext = createContext<FocusValue | null>(null);

export function useFocus(): FocusValue | null {
  return use(FocusContext);
}

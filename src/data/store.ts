import type { DayKey } from '@/lib/dates';
import type { Backup } from './backup';
import type { Settings, SettingsPatch } from './settings';
import type { BreakEntry, Entry, FocusEntry, NewEntry, WaterEntry } from './types';

/**
 * The app's only door to persisted data.
 *
 * The UI and the domain logic depend on these interfaces, never on IndexedDB or
 * Dexie. Today the one implementation is local (src/data/dexie). An optional
 * sync could later be added as another implementation, or as a decorator around
 * this one, without touching a single screen.
 */
export interface DataStore {
  water: EntryRepository<WaterEntry>;
  breaks: EntryRepository<BreakEntry>;
  focus: EntryRepository<FocusEntry>;
  settings: SettingsRepository;
  /** Short-lived device state: running timer, "in a meeting" until, snoozes. Not exported. */
  session: SessionRepository;

  exportBackup(now: number): Promise<Backup>;
  /** Replaces everything with the contents of a backup file. Throws BackupError. */
  importBackup(file: unknown): Promise<void>;
  clearAll(): Promise<void>;
}

/** A value that keeps itself up to date while someone is subscribed. */
export interface Live<T> {
  subscribe(onValue: (value: T) => void, onError?: (error: unknown) => void): () => void;
}

export interface EntryRepository<T extends Entry> {
  /** Stores a new entry. The id and the local day are assigned here. */
  add(entry: NewEntry<T>): Promise<T>;
  /** Puts an entry back exactly as it was, for undoing a removal. */
  restore(entry: T): Promise<void>;
  remove(id: string): Promise<void>;
  /** Entries from `from` to `to`, both inclusive, oldest first. */
  listBetween(from: DayKey, to: DayKey): Promise<T[]>;
  watchDay(day: DayKey): Live<T[]>;
  watchBetween(from: DayKey, to: DayKey): Live<T[]>;
}

export interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: SettingsPatch): Promise<Settings>;
  watch(): Live<Settings>;
}

export interface SessionRepository {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  watch<T>(key: string): Live<T | undefined>;
}

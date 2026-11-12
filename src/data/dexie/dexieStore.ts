import { liveQuery, type EntityTable } from 'dexie';
import { dayKey, type DayKey } from '@/lib/dates';
import { createBackup, parseBackup } from '../backup';
import { applySettingsPatch, normalizeSettings, type SettingsPatch } from '../settings';
import type {
  DataStore,
  EntryRepository,
  Live,
  SessionRepository,
  SettingsRepository,
} from '../store';
import type { Entry, NewEntry } from '../types';
import { HealthyWorkDB } from './db';

const SETTINGS_KEY = 'settings';
const SESSION_PREFIX = 'session:';

function live<T>(query: () => Promise<T>): Live<T> {
  return {
    subscribe(onValue, onError) {
      const subscription = liveQuery(query).subscribe({ next: onValue, error: onError });
      return () => subscription.unsubscribe();
    },
  };
}

function entryRepository<T extends Entry>(table: EntityTable<T, 'id'>): EntryRepository<T> {
  const between = (from: DayKey, to: DayKey) =>
    table.where('day').between(from, to, true, true).sortBy('at');

  return {
    async add(input: NewEntry<T>) {
      const entry = { ...input, id: crypto.randomUUID(), day: dayKey(input.at) } as T;
      await table.add(entry);
      return entry;
    },
    async restore(entry) {
      await table.put(entry);
    },
    async remove(id) {
      // Dexie types the key through the entity; every entity here is keyed by a string id.
      await table.delete(id as Parameters<typeof table.delete>[0]);
    },
    listBetween: between,
    watchDay: (day) => live(() => between(day, day)),
    watchBetween: (from, to) => live(() => between(from, to)),
  };
}

export function createDexieStore(db: HealthyWorkDB = new HealthyWorkDB()): DataStore {
  const readSettings = async () => normalizeSettings((await db.kv.get(SETTINGS_KEY))?.value);

  const settings: SettingsRepository = {
    get: readSettings,
    update(patch: SettingsPatch) {
      return db.transaction('rw', db.kv, async () => {
        const next = applySettingsPatch(await readSettings(), patch);
        await db.kv.put({ key: SETTINGS_KEY, value: next });
        return next;
      });
    },
    watch: () => live(readSettings),
  };

  const session: SessionRepository = {
    async get<T>(key: string) {
      return (await db.kv.get(SESSION_PREFIX + key))?.value as T | undefined;
    },
    async set(key, value) {
      await db.kv.put({ key: SESSION_PREFIX + key, value });
    },
    async remove(key) {
      await db.kv.delete(SESSION_PREFIX + key);
    },
    watch<T>(key: string) {
      return live(async () => (await db.kv.get(SESSION_PREFIX + key))?.value as T | undefined);
    },
  };

  const tables = [db.water, db.breaks, db.focus, db.kv];
  const oldestFirst = <T extends Entry>(entries: T[]) => entries.sort((a, b) => a.at - b.at);

  return {
    water: entryRepository(db.water),
    breaks: entryRepository(db.breaks),
    focus: entryRepository(db.focus),
    settings,
    session,

    async exportBackup(now) {
      const data = await db.transaction('r', tables, async () => ({
        settings: await readSettings(),
        water: oldestFirst(await db.water.toArray()),
        breaks: oldestFirst(await db.breaks.toArray()),
        focus: oldestFirst(await db.focus.toArray()),
      }));
      return createBackup(data, now);
    },

    async importBackup(file) {
      // Validate everything first: nothing is erased unless the whole file is good.
      const data = parseBackup(file);
      await db.transaction('rw', tables, async () => {
        await Promise.all(tables.map((table) => table.clear()));
        await db.kv.put({ key: SETTINGS_KEY, value: data.settings });
        await db.water.bulkAdd(data.water);
        await db.breaks.bulkAdd(data.breaks);
        await db.focus.bulkAdd(data.focus);
      });
    },

    async clearAll() {
      await db.transaction('rw', tables, () => Promise.all(tables.map((table) => table.clear())));
    },
  };
}

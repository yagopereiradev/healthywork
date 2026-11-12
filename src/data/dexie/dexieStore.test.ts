import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT_VERSION, BackupError } from '../backup';
import { DEFAULT_SETTINGS } from '../settings';
import type { DataStore } from '../store';
import { HealthyWorkDB } from './db';
import { createDexieStore } from './dexieStore';

let counter = 0;
const newStore = (): DataStore => createDexieStore(new HealthyWorkDB(`hw-test-${++counter}`));

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

const next = <T>(source: {
  subscribe(onValue: (v: T) => void, onError?: (e: unknown) => void): () => void;
}): Promise<T> =>
  new Promise((resolve, reject) => {
    const stop = source.subscribe((value) => {
      queueMicrotask(() => stop());
      resolve(value);
    }, reject);
  });

describe('entries', () => {
  it('assigns an id and the local day when adding', async () => {
    const store = newStore();
    const entry = await store.water.add({
      at: at(2026, 11, 12, 15, 2),
      amountMl: 250,
      drink: 'water',
    });

    expect(entry.id).toEqual(expect.any(String));
    expect(entry.day).toBe('2026-11-12');
    expect(await store.water.listBetween('2026-11-12', '2026-11-12')).toEqual([entry]);
  });

  it('keeps entries on either side of midnight in separate days', async () => {
    const store = newStore();
    await store.water.add({ at: at(2026, 11, 12, 23, 59), amountMl: 250, drink: 'water' });
    await store.water.add({ at: at(2026, 11, 13, 0, 0), amountMl: 500, drink: 'tea' });

    const thursday = await store.water.listBetween('2026-11-12', '2026-11-12');
    const friday = await store.water.listBetween('2026-11-13', '2026-11-13');
    expect(thursday.map((e) => e.amountMl)).toEqual([250]);
    expect(friday.map((e) => e.amountMl)).toEqual([500]);
  });

  it('lists a range inclusively, oldest first', async () => {
    const store = newStore();
    await store.breaks.add({
      at: at(2026, 11, 12, 14),
      type: 'eyes',
      durationSec: 60,
      origin: 'reminder',
    });
    await store.breaks.add({
      at: at(2026, 11, 10, 9),
      type: 'walk',
      durationSec: 300,
      origin: 'manual',
    });
    await store.breaks.add({
      at: at(2026, 11, 12, 10),
      type: 'back',
      durationSec: 120,
      origin: 'focus',
    });
    await store.breaks.add({
      at: at(2026, 11, 9, 9),
      type: 'walk',
      durationSec: 300,
      origin: 'manual',
    });

    const range = await store.breaks.listBetween('2026-11-10', '2026-11-12');
    expect(range.map((e) => e.type)).toEqual(['walk', 'back', 'eyes']);
  });

  it('removes an entry and can restore it unchanged (undo)', async () => {
    const store = newStore();
    const entry = await store.focus.add({
      at: at(2026, 11, 12, 13, 50),
      plannedSec: 1500,
      focusedSec: 1500,
      completed: true,
    });

    await store.focus.remove(entry.id);
    expect(await store.focus.listBetween('2026-11-12', '2026-11-12')).toEqual([]);

    await store.focus.restore(entry);
    expect(await store.focus.listBetween('2026-11-12', '2026-11-12')).toEqual([entry]);
  });

  it('pushes updates to a live day query', async () => {
    const store = newStore();
    const seen: number[] = [];
    const stop = store.water.watchDay('2026-11-12').subscribe((entries) => {
      seen.push(entries.length);
    });

    await expect.poll(() => seen).toEqual([0]);
    await store.water.add({ at: at(2026, 11, 12, 9), amountMl: 250, drink: 'water' });
    await expect.poll(() => seen).toEqual([0, 1]);
    // Another day does not wake this query's result.
    await store.water.add({ at: at(2026, 11, 13, 9), amountMl: 250, drink: 'water' });
    await store.water.add({ at: at(2026, 11, 12, 10), amountMl: 500, drink: 'coffee' });
    await expect.poll(() => seen.at(-1)).toBe(2);
    stop();
  });
});

describe('settings', () => {
  it('starts with the defaults', async () => {
    expect(await newStore().settings.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial update and keeps the rest', async () => {
    const store = newStore();
    const updated = await store.settings.update({
      water: { goalMl: 2500 },
      appearance: { theme: 'dark' },
    });

    expect(updated.water).toEqual({ goalMl: 2500, reminderEveryMin: 45 });
    expect(updated.appearance).toEqual({ theme: 'dark', language: null });
    expect(await store.settings.get()).toEqual(updated);
  });

  it('notifies watchers', async () => {
    const store = newStore();
    await store.settings.update({ onboardingDone: true });
    expect((await next(store.settings.watch())).onboardingDone).toBe(true);
  });
});

describe('session', () => {
  it('stores, reads and removes device state', async () => {
    const store = newStore();
    expect(await store.session.get('meeting')).toBeUndefined();

    await store.session.set('meeting', { until: 123 });
    expect(await store.session.get('meeting')).toEqual({ until: 123 });

    await store.session.remove('meeting');
    expect(await store.session.get('meeting')).toBeUndefined();
  });
});

describe('backup', () => {
  async function seeded(): Promise<DataStore> {
    const store = newStore();
    await store.settings.update({ water: { goalMl: 1800 }, onboardingDone: true });
    await store.water.add({ at: at(2026, 11, 12, 9), amountMl: 250, drink: 'water' });
    await store.water.add({ at: at(2026, 11, 11, 9), amountMl: 500, drink: 'coffee' });
    await store.breaks.add({
      at: at(2026, 11, 12, 10),
      type: 'walk',
      durationSec: 300,
      origin: 'reminder',
    });
    await store.focus.add({
      at: at(2026, 11, 12, 11),
      plannedSec: 1500,
      focusedSec: 900,
      completed: false,
    });
    await store.session.set('meeting', { until: 1 });
    return store;
  }

  it('exports a versioned file with everything but session state', async () => {
    const backup = await (await seeded()).exportBackup(at(2026, 11, 12, 18));

    expect(backup.app).toBe('healthywork');
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(backup.exportedAt).toBe(new Date(at(2026, 11, 12, 18)).toISOString());
    expect(backup.data.settings.water.goalMl).toBe(1800);
    expect(backup.data.water.map((e) => e.amountMl)).toEqual([500, 250]);
    expect(backup.data.breaks).toHaveLength(1);
    expect(backup.data.focus).toHaveLength(1);
    expect(JSON.stringify(backup)).not.toContain('meeting');
  });

  it('round-trips through JSON into an empty store', async () => {
    const backup = await (await seeded()).exportBackup(at(2026, 11, 12, 18));
    const target = newStore();

    await target.importBackup(JSON.parse(JSON.stringify(backup)));

    expect((await target.exportBackup(at(2026, 11, 12, 18))).data).toEqual(backup.data);
  });

  it('replaces existing data on import', async () => {
    const backup = await (await seeded()).exportBackup(0);
    const target = newStore();
    await target.water.add({ at: at(2020, 1, 1, 9), amountMl: 999, drink: 'other' });

    await target.importBackup(backup);

    expect(await target.water.listBetween('2020-01-01', '2020-01-01')).toEqual([]);
    expect(await target.water.listBetween('2026-11-11', '2026-11-12')).toHaveLength(2);
  });

  it('rejects a bad file without touching existing data', async () => {
    const store = await seeded();
    const backup = await store.exportBackup(0);
    const broken = {
      ...backup,
      data: { ...backup.data, water: [{ id: 'x', day: '2026-11-12', at: 1, amountMl: 'lots' }] },
    };

    await expect(store.importBackup(broken)).rejects.toMatchObject({ reason: 'invalid-data' });
    await expect(store.importBackup({ hello: 'world' })).rejects.toBeInstanceOf(BackupError);
    expect(await store.water.listBetween('2026-11-11', '2026-11-12')).toHaveLength(2);
  });

  it('refuses a file from a newer format instead of guessing', async () => {
    const store = newStore();
    const backup = await store.exportBackup(0);

    await expect(
      store.importBackup({ ...backup, formatVersion: BACKUP_FORMAT_VERSION + 1 }),
    ).rejects.toMatchObject({ reason: 'newer-version' });
  });

  it('clears everything', async () => {
    const store = await seeded();

    await store.clearAll();

    const backup = await store.exportBackup(0);
    expect(backup.data).toEqual({ settings: DEFAULT_SETTINGS, water: [], breaks: [], focus: [] });
    expect(await store.session.get('meeting')).toBeUndefined();
  });
});

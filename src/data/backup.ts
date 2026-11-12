import { normalizeSettings, type Settings } from './settings';
import {
  BREAK_ORIGINS,
  BREAK_TYPES,
  DRINK_TYPES,
  type BreakEntry,
  type FocusEntry,
  type WaterEntry,
} from './types';

/**
 * The backup file is the user's long-term copy of their data, so its format is
 * versioned on its own, independent of the app version and of the IndexedDB
 * schema.
 *
 * To change the format: bump BACKUP_FORMAT_VERSION and add a step to MIGRATIONS
 * that upgrades the previous version. Never edit an existing step: files
 * exported years ago must keep importing.
 */
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_APP_ID = 'healthywork';

export interface BackupData {
  settings: Settings;
  water: WaterEntry[];
  breaks: BreakEntry[];
  focus: FocusEntry[];
}

export interface Backup {
  app: typeof BACKUP_APP_ID;
  formatVersion: number;
  /** ISO 8601. */
  exportedAt: string;
  data: BackupData;
}

export type BackupErrorReason = 'not-healthywork' | 'newer-version' | 'invalid-data';

export class BackupError extends Error {
  readonly reason: BackupErrorReason;

  constructor(reason: BackupErrorReason, detail?: string) {
    super(detail ? `${reason}: ${detail}` : reason);
    this.name = 'BackupError';
    this.reason = reason;
  }
}

/** MIGRATIONS[n] upgrades the `data` of a version-n file to version n + 1. */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {};

export function createBackup(data: BackupData, now: number): Backup {
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date(now).toISOString(),
    data,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const oneOf = (options: readonly string[], value: unknown): boolean =>
  typeof value === 'string' && options.includes(value);

function isEntry(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.day === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.day) &&
    isCount(value.at)
  );
}

function readList<T>(
  data: Record<string, unknown>,
  key: string,
  read: (value: Record<string, unknown>) => T | null,
): T[] {
  const list = data[key];
  if (!Array.isArray(list)) throw new BackupError('invalid-data', `"${key}" is not a list`);
  return list.map((item, index) => {
    const entry = isEntry(item) ? read(item) : null;
    if (!entry) throw new BackupError('invalid-data', `${key}[${index}]`);
    return entry;
  });
}

/**
 * Validates a parsed backup file and returns its data in the current format.
 * The whole file is rejected if any record is invalid: importing replaces
 * everything, so a half-read file must never get that far.
 */
export function parseBackup(file: unknown): BackupData {
  if (!isRecord(file) || file.app !== BACKUP_APP_ID) throw new BackupError('not-healthywork');

  const version = file.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new BackupError('invalid-data', 'formatVersion');
  }
  if (version > BACKUP_FORMAT_VERSION) throw new BackupError('newer-version', String(version));

  let data = file.data;
  for (let v = version; v < BACKUP_FORMAT_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new BackupError('invalid-data', `no migration from version ${v}`);
    data = migrate(data);
  }
  if (!isRecord(data)) throw new BackupError('invalid-data', 'data');

  return {
    settings: normalizeSettings(data.settings),
    water: readList<WaterEntry>(data, 'water', (e) =>
      isCount(e.amountMl) && oneOf(DRINK_TYPES, e.drink)
        ? {
            id: e.id as string,
            day: e.day as string,
            at: e.at as number,
            amountMl: e.amountMl,
            drink: e.drink as WaterEntry['drink'],
          }
        : null,
    ),
    breaks: readList<BreakEntry>(data, 'breaks', (e) =>
      isCount(e.durationSec) &&
      (e.type === null || oneOf(BREAK_TYPES, e.type)) &&
      oneOf(BREAK_ORIGINS, e.origin)
        ? {
            id: e.id as string,
            day: e.day as string,
            at: e.at as number,
            type: e.type as BreakEntry['type'],
            durationSec: e.durationSec,
            origin: e.origin as BreakEntry['origin'],
          }
        : null,
    ),
    focus: readList<FocusEntry>(data, 'focus', (e) =>
      isCount(e.plannedSec) && isCount(e.focusedSec) && typeof e.completed === 'boolean'
        ? {
            id: e.id as string,
            day: e.day as string,
            at: e.at as number,
            plannedSec: e.plannedSec,
            focusedSec: e.focusedSec,
            completed: e.completed,
          }
        : null,
    ),
  };
}

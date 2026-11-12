import Dexie, { type EntityTable } from 'dexie';
import type { BreakEntry, FocusEntry, WaterEntry } from '../types';

export interface KeyValueRow {
  key: string;
  value: unknown;
}

/**
 * IndexedDB schema.
 *
 * People keep this database for years, so a released version is frozen: never
 * edit a `version(n)` block that has shipped. To change the schema, add
 * `this.version(n + 1).stores({...}).upgrade(tx => ...)` below the last one and
 * cover it with a test that opens a database created by the old version.
 *
 * Only indexed fields are listed. Entries are indexed by `day`, so reading a
 * day, a week or a month costs the same after one year or ten.
 */
export class HealthyWorkDB extends Dexie {
  declare water: EntityTable<WaterEntry, 'id'>;
  declare breaks: EntityTable<BreakEntry, 'id'>;
  declare focus: EntityTable<FocusEntry, 'id'>;
  declare kv: EntityTable<KeyValueRow, 'key'>;

  constructor(name = 'healthywork') {
    super(name);

    this.version(1).stores({
      water: 'id, day',
      breaks: 'id, day',
      focus: 'id, day',
      kv: 'key',
    });
  }
}

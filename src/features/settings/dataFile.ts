import { BackupError, parseBackup, type Backup, type BackupData } from '@/data/backup';
import { dayKey } from '@/lib/dates';

/** Why a chosen file cannot be imported. Each has its own message for the person. */
export type ImportProblem = 'not-healthywork' | 'newer-version' | 'invalid-data' | 'unreadable';

export type ReadResult =
  { ok: true; file: unknown; data: BackupData } | { ok: false; problem: ImportProblem };

/**
 * Reads and checks a backup file without touching any stored data. Importing
 * replaces everything, so the file is validated in full before the person is
 * even asked to confirm.
 */
export async function readBackupFile(blob: Blob): Promise<ReadResult> {
  let file: unknown;
  try {
    file = JSON.parse(await blob.text());
  } catch {
    return { ok: false, problem: 'unreadable' };
  }
  try {
    return { ok: true, file, data: parseBackup(file) };
  } catch (error) {
    return { ok: false, problem: error instanceof BackupError ? error.reason : 'invalid-data' };
  }
}

export function backupFileName(now: number): string {
  return `healthywork-backup-${dayKey(now)}.json`;
}

/** Hands the backup to the browser as a file download. Nothing leaves the device. */
export function downloadBackup(backup: Backup, now: number): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

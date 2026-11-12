import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/data/settings';
import {
  completeBlock,
  elapsedMs,
  endsAt,
  holdBreaksUntil,
  isComplete,
  isStale,
  isValidCustomBlock,
  pause,
  planFrom,
  progress,
  remainingMs,
  resume,
  startBlock,
  stopBlock,
} from './timer';

const MINUTE = 60_000;
const t0 = new Date(2026, 10, 12, 10, 0).getTime();
const after = (minutes: number) => t0 + minutes * MINUTE;
const plan = planFrom(DEFAULT_SETTINGS.focus); // 25 / 5, cycles of 4

describe('a running block', () => {
  const block = startBlock(plan, 1, t0);

  it('starts with the whole block ahead', () => {
    expect(remainingMs(block, t0)).toBe(25 * MINUTE);
    expect(progress(block, t0)).toBe(0);
    expect(isComplete(block, t0)).toBe(false);
  });

  it('counts down with the clock', () => {
    expect(elapsedMs(block, after(10))).toBe(10 * MINUTE);
    expect(remainingMs(block, after(10))).toBe(15 * MINUTE);
    expect(progress(block, after(10))).toBeCloseTo(0.4);
    expect(endsAt(block, after(10))).toBe(after(25));
  });

  it('is complete at the end and never runs past it', () => {
    expect(isComplete(block, after(25))).toBe(true);
    // Read much later (the laptop slept): still exactly one block.
    expect(elapsedMs(block, after(300))).toBe(25 * MINUTE);
    expect(remainingMs(block, after(300))).toBe(0);
    expect(progress(block, after(300))).toBe(1);
  });

  it('survives a reload: the state alone gives the time left', () => {
    const restored = JSON.parse(JSON.stringify(block)) as typeof block;
    expect(remainingMs(restored, after(7))).toBe(18 * MINUTE);
  });
});

describe('pausing', () => {
  it('stops the clock while paused and picks up where it left off', () => {
    const paused = pause(startBlock(plan, 1, t0), after(10));
    expect(remainingMs(paused, after(10))).toBe(15 * MINUTE);
    expect(remainingMs(paused, after(40))).toBe(15 * MINUTE);
    expect(endsAt(paused, after(40))).toBeNull();
    expect(isComplete(paused, after(400))).toBe(false);

    const resumed = resume(paused, after(40));
    expect(remainingMs(resumed, after(40))).toBe(15 * MINUTE);
    expect(endsAt(resumed, after(40))).toBe(after(55));
    expect(isComplete(resumed, after(55))).toBe(true);
  });

  it('adds up several pauses', () => {
    let block = startBlock(plan, 1, t0);
    block = resume(pause(block, after(5)), after(8)); // 3 minutes paused
    block = resume(pause(block, after(12)), after(20)); // 8 minutes paused
    expect(elapsedMs(block, after(22))).toBe(11 * MINUTE);
    expect(endsAt(block, after(22))).toBe(after(36));
  });

  it('ignores pausing twice and resuming what is not paused', () => {
    const paused = pause(startBlock(plan, 1, t0), after(10));
    expect(pause(paused, after(12))).toBe(paused);
    const running = startBlock(plan, 1, t0);
    expect(resume(running, after(3))).toBe(running);
  });
});

describe('finishing a block', () => {
  it('logs the full block and gets the next one ready', () => {
    const { entry, next } = completeBlock(startBlock(plan, 2, t0));
    expect(entry).toEqual({ at: t0, plannedSec: 1500, focusedSec: 1500, completed: true });
    expect(next).toEqual({ phase: 'ready', plan, block: 3 });
  });

  it('ends the cycle after the fourth block', () => {
    expect(completeBlock(startBlock(plan, 4, t0)).next).toBeNull();
  });

  it('logs only the planned time even when paused along the way', () => {
    const block = resume(pause(startBlock(plan, 1, t0), after(10)), after(30));
    expect(completeBlock(block).entry.focusedSec).toBe(1500);
  });

  it('knows when a block ended with nobody there to see it', () => {
    const block = startBlock(plan, 1, t0);
    expect(isStale(block, after(26))).toBe(false);
    expect(isStale(block, after(35))).toBe(false);
    expect(isStale(block, after(36))).toBe(true);
    // Paused time moves the end, so it moves the deadline too.
    const withPause = resume(pause(block, after(10)), after(30));
    expect(isStale(withPause, after(50))).toBe(false);
  });
});

describe('ending early', () => {
  it('logs what was focused as an unfinished block', () => {
    const block = startBlock(plan, 1, t0);
    expect(stopBlock(block, after(12))).toEqual({
      at: t0,
      plannedSec: 1500,
      focusedSec: 720,
      completed: false,
    });
  });

  it('does not count paused time', () => {
    const block = pause(startBlock(plan, 1, t0), after(4));
    expect(stopBlock(block, after(30))?.focusedSec).toBe(240);
  });

  it('logs nothing for a block that barely started', () => {
    expect(stopBlock(startBlock(plan, 1, t0), t0 + 45_000)).toBeNull();
  });
});

describe('holding movement reminders', () => {
  it('holds them until the end of a running block', () => {
    expect(holdBreaksUntil(startBlock(plan, 1, t0), after(10))).toBe(after(25));
  });

  it('holds nothing while paused, between blocks or with no session', () => {
    expect(holdBreaksUntil(pause(startBlock(plan, 1, t0), after(10)), after(20))).toBeNull();
    expect(holdBreaksUntil({ phase: 'ready', plan, block: 2 }, after(30))).toBeNull();
    expect(holdBreaksUntil(null, t0)).toBeNull();
    expect(holdBreaksUntil(undefined, t0)).toBeNull();
  });
});

describe('custom blocks', () => {
  it('accepts sensible lengths and rejects the rest', () => {
    expect(isValidCustomBlock(40, 8)).toBe(true);
    expect(isValidCustomBlock(5, 1)).toBe(true);
    expect(isValidCustomBlock(120, 30)).toBe(true);
    expect(isValidCustomBlock(4, 5)).toBe(false);
    expect(isValidCustomBlock(121, 5)).toBe(false);
    expect(isValidCustomBlock(25, 0)).toBe(false);
    expect(isValidCustomBlock(25, 31)).toBe(false);
    expect(isValidCustomBlock(25.5, 5)).toBe(false);
  });
});

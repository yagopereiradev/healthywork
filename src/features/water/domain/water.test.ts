import { describe, expect, it } from 'vitest';
import { crossesGoal, goalProgress, isValidAmount, parseAmount, totalMl } from './water';

describe('totalMl', () => {
  it('adds every drink, whatever its type', () => {
    expect(totalMl([{ amountMl: 250 }, { amountMl: 500 }, { amountMl: 180 }])).toBe(930);
    expect(totalMl([])).toBe(0);
  });
});

describe('isValidAmount', () => {
  it('accepts whole millilitres up to a single large bottle', () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(2000)).toBe(true);
  });

  it('rejects zero, negatives, fractions and typos', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-250)).toBe(false);
    expect(isValidAmount(250.5)).toBe(false);
    expect(isValidAmount(25000)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
  });
});

describe('parseAmount', () => {
  it('reads plain numbers, with or without the unit', () => {
    expect(parseAmount('300')).toBe(300);
    expect(parseAmount(' 300 ml ')).toBe(300);
    expect(parseAmount('750ML')).toBe(750);
  });

  it('returns null for anything else', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('a lot')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('2,5')).toBeNull();
    expect(parseAmount('99999')).toBeNull();
  });
});

describe('goalProgress', () => {
  it('reports the share of the goal and what is left', () => {
    expect(goalProgress(1250, 2000)).toEqual({ ratio: 0.625, remainingMl: 750, reached: false });
  });

  it('caps at the goal', () => {
    expect(goalProgress(2600, 2000)).toEqual({ ratio: 1, remainingMl: 0, reached: true });
    expect(goalProgress(2000, 2000).reached).toBe(true);
  });

  it('is safe with an empty day or a zero goal', () => {
    expect(goalProgress(0, 2000)).toEqual({ ratio: 0, remainingMl: 2000, reached: false });
    expect(goalProgress(500, 0)).toEqual({ ratio: 0, remainingMl: 0, reached: false });
  });
});

describe('crossesGoal', () => {
  it('is true only for the record that reaches the goal', () => {
    expect(crossesGoal(1750, 250, 2000)).toBe(true);
    expect(crossesGoal(1900, 500, 2000)).toBe(true);
  });

  it('is false before the goal and after it was already reached', () => {
    expect(crossesGoal(1000, 250, 2000)).toBe(false);
    expect(crossesGoal(2000, 250, 2000)).toBe(false);
    expect(crossesGoal(2250, 250, 2000)).toBe(false);
  });
});

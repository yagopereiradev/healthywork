import type { BreakType } from '@/data/types';
import type { EvidenceTopic } from '@/features/evidence/domain/sources';

interface Exercise {
  /** Seconds on the countdown. Walking uses the break length from settings instead. */
  durationSec: number | 'from-settings';
  /** Which "Why?" explains it. Only walking and the eye break have a study of their own. */
  evidence: EvidenceTopic;
}

/**
 * The breaks the app can suggest. Their titles and steps are in the `breaks`
 * translations, three steps each. Keep them plain: things anyone can do at a
 * desk without equipment, with no health promise attached.
 */
export const EXERCISES: Record<BreakType, Exercise> = {
  walk: { durationSec: 'from-settings', evidence: 'breaks' },
  'neck-shoulders': { durationSec: 60, evidence: 'microbreaks' },
  // The 20-20-20 rule: 20 seconds looking far away.
  eyes: { durationSec: 20, evidence: 'eyes' },
  wrists: { durationSec: 60, evidence: 'microbreaks' },
  back: { durationSec: 60, evidence: 'microbreaks' },
};

export const EXERCISE_STEPS = ['step1', 'step2', 'step3'] as const;

export function exerciseDurationSec(type: BreakType, breakDurationMin: number): number {
  const duration = EXERCISES[type].durationSec;
  return duration === 'from-settings' ? breakDurationMin * 60 : duration;
}

/** Which step is highlighted: the countdown walks through them in equal parts. */
export function currentStep(elapsedSec: number, durationSec: number, steps: number): number {
  if (durationSec <= 0) return 0;
  return Math.min(steps - 1, Math.max(0, Math.floor((elapsedSec / durationSec) * steps)));
}

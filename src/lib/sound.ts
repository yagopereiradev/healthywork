/**
 * Reminder sounds, synthesized with Web Audio: no audio files to ship, and each
 * kind is short and easy to tell apart without looking.
 *
 *   water   two quick rising notes, like a drop
 *   break   two warm, slower notes
 *   focus   three rising notes, for the end of a block
 */
export type SoundKind = 'water' | 'break' | 'focus';

interface Note {
  /** Hz. A pair glides from the first to the second. */
  frequency: number | [number, number];
  /** Seconds after the sound starts. */
  at: number;
  /** Seconds. */
  length: number;
}

const SOUNDS: Record<SoundKind, { wave: OscillatorType; notes: Note[] }> = {
  water: {
    wave: 'sine',
    notes: [
      { frequency: [880, 1245], at: 0, length: 0.16 },
      { frequency: 1480, at: 0.13, length: 0.3 },
    ],
  },
  break: {
    wave: 'triangle',
    notes: [
      { frequency: 392, at: 0, length: 0.32 },
      { frequency: 523.25, at: 0.24, length: 0.55 },
    ],
  },
  focus: {
    wave: 'triangle',
    notes: [
      { frequency: 523.25, at: 0, length: 0.22 },
      { frequency: 659.25, at: 0.17, length: 0.22 },
      { frequency: 783.99, at: 0.34, length: 0.6 },
    ],
  },
};

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (context) return context;
  const Context = window.AudioContext;
  if (!Context) return null;
  context = new Context();
  return context;
}

/**
 * Browsers only let a page make sound after the person has interacted with it.
 * Call this from the first click or key press so later reminders can be heard.
 */
export function unlockSound(): void {
  const ctx = audioContext();
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
}

/** Plays the sound for a kind of reminder. `volume` goes from 0 to 1. */
export function playSound(kind: SoundKind, volume: number): void {
  const ctx = audioContext();
  if (!ctx || volume <= 0) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

  const { wave, notes } = SOUNDS[kind];
  const peak = Math.min(Math.max(volume, 0), 1) * 0.5;
  const start = ctx.currentTime + 0.02;

  for (const note of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const from = start + note.at;
    const [first, last] = Array.isArray(note.frequency)
      ? note.frequency
      : [note.frequency, note.frequency];

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(first, from);
    if (last !== first) oscillator.frequency.exponentialRampToValueAtTime(last, from + note.length);

    // A soft attack and a natural decay: no click at either end.
    gain.gain.setValueAtTime(0.0001, from);
    gain.gain.exponentialRampToValueAtTime(peak, from + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, from + note.length);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(from);
    oscillator.stop(from + note.length + 0.05);
  }
}

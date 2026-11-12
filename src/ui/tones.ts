/**
 * Each module always uses its own colour: water (teal), move (terracotta) for
 * breaks, focus (indigo). The full class names are spelled out so Tailwind can
 * find them.
 */
export type Tone = 'water' | 'move' | 'focus';

interface ToneClasses {
  /** Accent fill with its text colour: primary buttons. */
  accent: string;
  /** Accent as a plain fill: progress bars, dots. */
  fill: string;
  /** Tinted background. */
  soft: string;
  /** Accent-coloured text. */
  ink: string;
  /** Quieter text on the tinted background. */
  ink2: string;
  /** Hollow dot outline for things that have not happened yet. */
  ring: string;
  /** Border on the tinted background. */
  softLine: string;
  /** Large solid card. */
  solid: string;
  /** Secondary text on the solid card. */
  solidMuted: string;
  /** Inset or track on the solid card. */
  solidDeep: string;
  /** Text in the solid colour, for white buttons on the solid card. */
  solidInk: string;
  /** Border on the solid card. */
  solidLine: string;
}

export const TONES: Record<Tone, ToneClasses> = {
  water: {
    accent: 'bg-water text-water-on',
    fill: 'bg-water',
    soft: 'bg-water-soft',
    ink: 'text-water-ink',
    ink2: 'text-ink-2',
    ring: 'border-water',
    softLine: 'border-water-line',
    solid: 'bg-water-solid text-solid-on',
    solidMuted: 'text-water-muted',
    solidDeep: 'bg-water-deep',
    solidInk: 'text-water-solid',
    solidLine: 'border-water-muted',
  },
  move: {
    accent: 'bg-move text-move-on',
    fill: 'bg-move',
    soft: 'bg-move-soft',
    ink: 'text-move-ink',
    ink2: 'text-move-ink-2',
    ring: 'border-move',
    softLine: 'border-move-line',
    solid: 'bg-move-solid text-solid-on',
    solidMuted: 'text-move-muted',
    solidDeep: 'bg-move-deep',
    solidInk: 'text-move-solid',
    solidLine: 'border-move-muted',
  },
  focus: {
    accent: 'bg-focus text-focus-on',
    fill: 'bg-focus',
    soft: 'bg-focus-soft',
    ink: 'text-focus-ink',
    ink2: 'text-focus-ink-2',
    ring: 'border-focus',
    softLine: 'border-focus-line',
    solid: 'bg-focus-solid text-solid-on',
    solidMuted: 'text-focus-muted',
    solidDeep: 'bg-focus-deep',
    solidInk: 'text-focus-solid',
    solidLine: 'border-focus-muted',
  },
};

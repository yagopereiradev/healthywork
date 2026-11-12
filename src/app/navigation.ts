import type { Tone } from '@/ui/tones';

export interface NavItem {
  to: string;
  /** Key under `nav.` in the common translations. */
  label: 'today' | 'focus' | 'history' | 'settings';
  /** The active item takes the colour of the module it leads to. */
  tone: Tone;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'today', tone: 'water' },
  { to: '/focus', label: 'focus', tone: 'focus' },
  { to: '/history', label: 'history', tone: 'water' },
  { to: '/settings', label: 'settings', tone: 'water' },
];

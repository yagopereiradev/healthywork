import { create } from 'zustand';

/** Whether the "In a meeting?" sheet is open. It can be opened from the page and with M. */
export const useMeetingSheet = create<{ open: boolean; show: () => void; hide: () => void }>(
  (set) => ({
    open: false,
    show: () => set({ open: true }),
    hide: () => set({ open: false }),
  }),
);

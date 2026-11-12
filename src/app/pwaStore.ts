import { create } from 'zustand';

/** Chrome and Edge fire this when the app can be installed. Not in lib.dom yet. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** Present while the browser is offering installation. */
  installPrompt: BeforeInstallPromptEvent | null;
  /** A new version is downloaded and waiting. */
  updateReady: boolean;
  applyUpdate: () => void;
  install: () => Promise<void>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  installPrompt: null,
  updateReady: false,
  applyUpdate: () => {},
  install: async () => {
    const prompt = get().installPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    // The event can only be used once.
    set({ installPrompt: null });
  },
}));

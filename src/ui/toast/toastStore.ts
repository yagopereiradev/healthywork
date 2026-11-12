import { create } from 'zustand';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  /** confirm shows a check; notice is a plain short message. */
  kind: 'confirm' | 'notice';
  action?: ToastAction;
  durationMs: number;
}

export type ToastInput = Pick<Toast, 'message'> & Partial<Omit<Toast, 'id' | 'message'>>;

/** At most this many are visible; older ones leave to make room. */
export const MAX_TOASTS = 3;
const DEFAULT_DURATION_MS = 4000;
/** Toasts with an action stay longer, so there is time to reach "Undo". */
const ACTION_DURATION_MS = 6500;

interface ToastState {
  toasts: Toast[];
  show: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  show: (input) => {
    const toast: Toast = {
      id: nextId++,
      kind: 'confirm',
      durationMs: input.action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS,
      ...input,
    };
    set((state) => ({ toasts: [...state.toasts, toast].slice(-MAX_TOASTS) }));
    return toast.id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** For code outside React (and for tests). */
export const showToast = (toast: ToastInput): number => useToasts.getState().show(toast);

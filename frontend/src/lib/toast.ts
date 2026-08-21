// src/lib/toast.ts
// Import and use this in any component to trigger toast notifications
import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;
export const toasts = writable<Toast[]>([]);

export function toast(message: string, type: ToastType = 'info'): void {
  const id = ++counter;
  toasts.update((t) => [...t, { id, message, type }]);
  setTimeout(() => {
    toasts.update((t) => t.filter((x) => x.id !== id));
  }, 4000);
}

export const toastSuccess = (msg: string) => toast(msg, 'success');
export const toastError   = (msg: string) => toast(msg, 'error');
export const toastInfo    = (msg: string) => toast(msg, 'info');
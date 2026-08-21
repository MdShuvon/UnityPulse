// src/lib/stores.ts
import { writable } from 'svelte/store';

// User store
export const user = writable<any>(null);
export const isAuthenticated = writable<boolean>(false);

// Loading state
export const isLoading = writable<boolean>(false);

// Error state
export const error = writable<string | null>(null);

// Theme store (optional)
export const theme = writable<'light' | 'dark'>('light');

// Helper function to reset stores
export function resetStores() {
  user.set(null);
  isAuthenticated.set(false);
  isLoading.set(false);
  error.set(null);
  theme.set('light');
}
import { getContext, setContext } from 'svelte';

const USER_KEY = Symbol('user');

export function setUserContext(userState: { value: any }) {
  setContext(USER_KEY, userState);
}

export function getUserContext(): { value: any } {
  return getContext(USER_KEY);
}
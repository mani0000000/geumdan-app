/**
 * lib/identity.ts
 * Lightweight user identity helpers using localStorage.
 */

const NICKNAME_KEY = 'gd_nickname';
const DEFAULT_NICKNAME = '검단주민';

export function getMyNickname(): string {
  if (typeof window === 'undefined') return DEFAULT_NICKNAME;
  return localStorage.getItem(NICKNAME_KEY) || DEFAULT_NICKNAME;
}

export function setMyNickname(nickname: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NICKNAME_KEY, nickname);
}

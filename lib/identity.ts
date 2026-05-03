const KEY = "myNickname";
const DEFAULT = "검단주민";

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export function getMyNickname(): string {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = localStorage.getItem(KEY);
    if (v && v.trim()) return v;
    const generated = `${DEFAULT}_${randomSuffix()}`;
    localStorage.setItem(KEY, generated);
    return generated;
  } catch {
    return DEFAULT;
  }
}

export function setMyNickname(nickname: string) {
  if (typeof window === "undefined") return;
  const v = nickname.trim();
  if (!v) return;
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
}

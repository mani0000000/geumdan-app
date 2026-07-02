export function normalizeKoreanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return value.trim().startsWith("+") ? value.trim() : `+${digits}`;
}

export function isValidKoreanMobile(value: string): boolean {
  return /^\+8210\d{8}$/.test(normalizeKoreanPhone(value));
}

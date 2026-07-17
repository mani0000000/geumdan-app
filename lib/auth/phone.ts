import { supabase } from "@/lib/supabase";

export function normalizeKoreanMobile(value: string): string | null {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^010\d{8}$/.test(compact)) return `+82${compact.slice(1)}`;
  if (/^8210\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+8210\d{8}$/.test(compact)) return compact;
  return null;
}

export function formatKoreanMobile(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^82(?=10)/, "0").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function phoneAuthErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw.toLowerCase();
  if (message.includes("phone provider is not enabled") || message.includes("unsupported phone provider")) {
    return "휴대폰 인증 서비스 설정을 확인하고 있어요. 잠시 후 다시 시도해 주세요.";
  }
  if (message.includes("sms") && (message.includes("provider") || message.includes("send"))) {
    return "인증문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (message.includes("rate") || message.includes("too many")) {
    return "인증 요청이 너무 잦아요. 1분 뒤 다시 시도해 주세요.";
  }
  if (message.includes("expired") || message.includes("token has expired")) {
    return "인증번호 유효시간이 지났어요. 새 인증번호를 받아 주세요.";
  }
  if (message.includes("invalid") || message.includes("token")) {
    return "인증번호가 올바르지 않아요. 문자에 적힌 6자리를 확인해 주세요.";
  }
  if (message.includes("signups not allowed") || message.includes("user not found")) {
    return "가입된 휴대폰 번호가 아니에요. 먼저 회원가입해 주세요.";
  }
  if (message.includes("402") || message.includes("restricted") || message.includes("egress")) {
    return "현재 인증 서버 이용이 제한되어 있어요. 잠시 후 다시 시도해 주세요.";
  }
  return raw || "휴대폰 인증 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
}

export async function requestPhoneOtp(phone: string, shouldCreateUser: boolean) {
  const normalized = normalizeKoreanMobile(phone);
  if (!normalized) throw new Error("010으로 시작하는 휴대폰 번호 11자리를 입력해 주세요.");
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalized,
    options: { shouldCreateUser },
  });
  if (error) throw error;
  return normalized;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const normalized = normalizeKoreanMobile(phone);
  if (!normalized) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  if (!/^\d{6}$/.test(token)) throw new Error("인증번호 6자리를 입력해 주세요.");
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: "sms",
  });
  if (error) throw error;
  const session = data.session;
  const user = data.user;
  if (!session || !user) throw new Error("로그인 세션을 만들지 못했어요. 다시 시도해 주세요.");
  return { session, user };
}

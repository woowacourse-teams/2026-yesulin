import { topicParticle } from "@/features/korean";

export function formatKoreanPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, value.replace(/\D/g, "").startsWith("02") ? 10 : 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, -4)}-${digits.slice(-4)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
}

export function isValidKoreanPhone(value: string) {
  return /^(?:02-\d{3,4}|0\d{2}-\d{3,4})-\d{4}$/.test(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * 키·몸무게는 Backend가 정수로 보관한다. 소수점을 그대로 보내면 조용히 잘려
 * 배우가 입력한 값과 기획사가 보는 값이 달라지므로 입력 단계에서 막는다.
 */
export function isIntegerMeasurement(value: string | number) {
  const text = String(value).trim();
  return text === "" || /^\d+$/.test(text);
}

export function integerMeasurementError(label: string) {
  return `${topicParticle(label)} 소수점 없이 정수로 입력해 주세요.`;
}

/** 입력 도중인 숫자와 존재하지 않는 날짜를 저장 가능한 날짜와 구분한다. */
export function isValidBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function profileBirthDateError(value: string, now = new Date()) {
  if (!value) return "";
  if (!isValidBirthDate(value)) return "생년월일을 올바른 날짜의 숫자 8자리로 입력해 주세요. 예: 19990315";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
  return value > today ? "생년월일은 오늘 또는 이전 날짜로 입력해 주세요." : "";
}

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
  return `${label}은(는) 소수점 없이 정수로 입력해 주세요.`;
}

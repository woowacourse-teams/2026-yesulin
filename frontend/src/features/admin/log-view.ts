import type { AdminLogEntry, AdminLogLevel } from "./types";

export type AdminLogFilters = {
  readonly levels: readonly AdminLogLevel[];
  readonly slowRequestsOnly: boolean;
  readonly requestId: string;
  readonly keyword: string;
};

const HTTP_SLOW_MILLIS = 1000;

const ENHANCED_SMTP_REASONS = new Map([
  ["5.1.1", "받는 주소가 존재하지 않음"],
  ["5.1.2", "받는 주소의 도메인을 찾을 수 없음"],
  ["5.2.1", "받는 사서함을 사용할 수 없음"],
  ["4.2.2", "받는 사서함 용량 초과"],
  ["5.2.2", "받는 사서함 용량 초과"],
  ["5.7.1", "메일 정책 또는 전달 권한 문제로 거절됨"],
  ["5.7.26", "발신 메일 인증 실패"],
]);

const MAIL_FAILURE_REASONS = new Map([
  ["SMTP_RECIPIENT_REJECTED", "메일 서버가 받는 주소를 거절함"],
  ["SMTP_SENDER_REJECTED", "메일 서버가 보내는 주소를 거절함"],
  ["SMTP_COMMAND_REJECTED", "메일 서버가 전송 요청을 거절함"],
  ["SMTP_AUTHENTICATION_FAILED", "메일 서버 로그인 실패"],
  ["SMTP_TIMEOUT", "메일 서버 응답 시간 초과"],
  ["SMTP_TLS_FAILED", "메일 서버와 암호화 연결 실패"],
  ["SMTP_CONNECTION_FAILED", "메일 서버 연결 실패"],
  ["SMTP_DNS_FAILED", "메일 서버 주소를 찾을 수 없음"],
  ["MAIL_PREPARATION_FAILED", "메일 생성 실패"],
  ["VERIFICATION_ISSUE_FAILED", "인증 정보 발급 실패"],
]);

function attributeText(entry: AdminLogEntry, key: string): string | null {
  const value = entry.attributes[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function logEvent(entry: AdminLogEntry): string {
  return entry.format === "LEGACY" ? "LEGACY" : attributeText(entry, "event") ?? "STRUCTURED";
}

export function logElapsedMs(entry: AdminLogEntry): number | null {
  const value = entry.attributes.elapsedMs;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isSlowHttpRequest(entry: AdminLogEntry): boolean {
  const elapsedMs = logElapsedMs(entry);
  return logEvent(entry) === "HTTP_REQUEST" && elapsedMs !== null && elapsedMs >= HTTP_SLOW_MILLIS;
}

export function shortRequestId(requestId: string | null): string {
  if (!requestId) return "-";
  return requestId.length <= 10 ? requestId : `${requestId.slice(0, 8)}…`;
}

function serviceSummary(entry: AdminLogEntry): string | null {
  const className = attributeText(entry, "class");
  const method = attributeText(entry, "method");
  if (!className && !method) return null;
  return [className, method].filter(Boolean).join(".");
}

function httpSummary(entry: AdminLogEntry): string | null {
  const method = attributeText(entry, "method");
  const endpoint = attributeText(entry, "endpoint") ?? attributeText(entry, "uri");
  const status = entry.attributes.status;
  const target = [method, endpoint].filter(Boolean).join(" ");
  if (!target) return null;
  return status === undefined || status === null ? target : `${target} → ${String(status)}`;
}

function verificationMailSummary(entry: AdminLogEntry): string | null {
  const failure = attributeText(entry, "mailFailureReason");
  if (!failure) return null;
  const status = smtpReplyCode(entry);
  const candidate = attributeText(entry, "smtpEnhancedStatus");
  const enhanced = verifiedEnhancedCode(candidate, status);
  const reason = ENHANCED_SMTP_REASONS.get(enhanced)
    ?? MAIL_FAILURE_REASONS.get(failure)
    ?? "인증 메일 발송 실패";
  const summary = [entry.message?.trim(), reason].filter(Boolean).join(" · ");
  if (!status) return summary;
  return `${summary} (SMTP ${[status, enhanced].filter(Boolean).join(" ")})`;
}

function smtpReplyCode(entry: AdminLogEntry): string {
  const status = entry.attributes.smtpStatus;
  if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599) {
    return String(status);
  }
  return "";
}

function verifiedEnhancedCode(candidate: string | null, status: string): string {
  const code = candidate?.trim();
  if (code && code[0] === status[0] && /^[45]\.[0-9]{1,3}\.[0-9]{1,3}$/.test(code)) return code;
  return "";
}

export function logSummary(entry: AdminLogEntry): string {
  const event = logEvent(entry);
  if (event === "HTTP_REQUEST") return httpSummary(entry) ?? entry.message ?? entry.raw;
  if (event === "SLOW_SERVICE" || event === "SERVICE_CALL") {
    return serviceSummary(entry) ?? entry.message ?? entry.raw;
  }
  return verificationMailSummary(entry) ?? (entry.message?.trim() || entry.raw);
}

function searchableText(entry: AdminLogEntry): string {
  return [
    entry.timestamp,
    entry.level,
    entry.logger,
    entry.thread,
    entry.requestId,
    entry.message,
    entry.raw,
    JSON.stringify(entry.attributes),
  ].filter(Boolean).join(" ").toLowerCase();
}

export function filterLogEntries(
  entries: readonly AdminLogEntry[],
  filters: AdminLogFilters,
): readonly AdminLogEntry[] {
  const requestId = filters.requestId.trim().toLowerCase();
  const keyword = filters.keyword.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filters.levels.length > 0 && (!entry.level || !filters.levels.includes(entry.level))) return false;
    if (filters.slowRequestsOnly && !isSlowHttpRequest(entry)) return false;
    if (requestId && !entry.requestId?.toLowerCase().includes(requestId)) return false;
    return !keyword || searchableText(entry).includes(keyword);
  });
}

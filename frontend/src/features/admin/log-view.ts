import type { AdminLogEntry } from "./types";

export type AdminLogFilters = {
  readonly errorsOnly: boolean;
  readonly slowRequestsOnly: boolean;
  readonly requestId: string;
  readonly keyword: string;
};

const HTTP_SLOW_MILLIS = 1000;

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

export function logSummary(entry: AdminLogEntry): string {
  const event = logEvent(entry);
  if (event === "HTTP_REQUEST") return httpSummary(entry) ?? entry.message ?? entry.raw;
  if (event === "SLOW_SERVICE" || event === "SERVICE_CALL") {
    return serviceSummary(entry) ?? entry.message ?? entry.raw;
  }
  return entry.message?.trim() || entry.raw;
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
    if (filters.errorsOnly && entry.level !== "ERROR") return false;
    if (filters.slowRequestsOnly && !isSlowHttpRequest(entry)) return false;
    if (requestId && !entry.requestId?.toLowerCase().includes(requestId)) return false;
    return !keyword || searchableText(entry).includes(keyword);
  });
}

/** Display dates without inventing missing days or interpreting free-form biographies. */
type DateParts = { year: number; month?: number; day?: number };
function valid(p: DateParts): boolean {
  if (p.year < 0 || p.year > 9999 || p.month !== undefined && (p.month < 1 || p.month > 12)) return false;
  if (p.day !== undefined) {
    if (p.month === undefined || p.day < 1) return false;
    const year = p.year < 100 ? 2000 + p.year : p.year;
    if (p.day > new Date(Date.UTC(year, p.month, 0)).getUTCDate()) return false;
  }
  return true;
}
function tokens(raw: string): number[] | null {
  const cleaned = raw.trim().replace(/[년월]/g, ".").replace(/일/g, "").replace(/[/-]/g, ".").replace(/\s+/g, "").replace(/\.$/, "");
  return /^\d{1,4}(?:\.\d{1,2}){0,2}$/.test(cleaned) ? cleaned.split(".").map(Number) : null;
}
function display(p: DateParts): string {
  if (p.month === undefined) return `${p.year}년`;
  // Compact display uses YY; the unmodified source is retained in the tooltip.
  return `${String(p.year).slice(-2).padStart(2, "0")}.${String(p.month).padStart(2, "0")}`;
}
type ParsedPeriod = { start: DateParts; end?: DateParts; ongoing?: boolean };
function parsePeriod(raw?: string): ParsedPeriod | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().replace(/～|∼/g, "~");
  const parts = normalized.split(/\s*(?:~|–|—|\s+-\s+)\s*/u);
  if (parts.length > 2) return null;
  const a = tokens(parts[0]);
  if (!a || !/^(?:\d{2}|\d{4})(?:[.년/\s-]|$)/.test(parts[0].trim())) return null;
  const start: DateParts = { year: a[0], month: a[1], day: a[2] };
  if (!valid(start)) return null;
  if (parts.length === 1) return { start };
  if (/^(?:현재|진행중|진행 중)$/.test(parts[1])) return { start, ongoing: true };
  const b = tokens(parts[1]);
  if (!b) return null;
  let end: DateParts;
  if (b.length === 3 || b[0] > 31 || b.length === 1 && a.length === 1) end = { year: b[0], month: b[1], day: b[2] };
  else if (b.length === 2 && a.length === 2) end = { year: b[0], month: b[1] };
  else if (b.length === 2 && a.length === 3) end = { year: start.year, month: b[0], day: b[1] };
  else if (b.length === 1 && a.length === 2) end = { year: start.year, month: b[0] };
  else return null;
  if (!valid(end)) return null;
  const key = (p: DateParts) => (p.year < 100 ? 2000 + p.year : p.year) * 10000 + (p.month ?? 1) * 100 + (p.day ?? 1);
  // An omitted year across December/January is ambiguous: retain the source.
  if (key(end) < key(start)) return null;
  return { start, end };
}

export function formatCareerPeriod(raw?: string): string {
  const period = parsePeriod(raw);
  if (!period) return raw?.trim() ?? "";
  if (period.ongoing) return `${display(period.start)} – 현재`;
  const start = display(period.start), end = period.end ? display(period.end) : start;
  return start === end ? start : `${start} – ${end}`;
}

/** Sort only validated explicit dates. Unknown periods retain source order after dated records. */
export function careerPeriodOrder(raw?: string): number | null {
  const period = parsePeriod(raw);
  if (!period) return null;
  if (period.ongoing) return Number.POSITIVE_INFINITY;
  const end = period.end ?? period.start;
  return (end.year < 100 ? 2000 + end.year : end.year) * 100 + (end.month ?? 0);
}

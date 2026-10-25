import { careerPeriodOrder, formatCareerPeriod } from "./career-format";
export type DisplayCareerSource = { readonly text: string; readonly title?: string; readonly part?: string; readonly period?: string; readonly genre?: string; readonly company?: string };
export type DisplayCareer = { title: string; detail: string; genre: string; period: string; rawPeriod: string; company: string; sourceText: string; order: number | null };
// A genre followed by a title and a dotted date has explicit boundaries. The trailing
// venue/role text remains intact: the last word is not necessarily the whole role.
const LINE = /^(뮤지컬|연극|음악극|오페라|무용|공연|영화|드라마)\s+(.+?)\s+((?:\d{4}|\d{2})\.\d{1,2}(?:\.\d{1,2})?(?:\s*[~～∼–—]\s*(?:(?:\d{4}|\d{1,2})(?:\.\d{1,2}){0,2}|현재|진행 중|진행중))?)(?:\s+(.+))?$/u;
export function careerDisplay(source: DisplayCareerSource): DisplayCareer {
  const line = !source.title ? source.text.trim().match(LINE) : null;
  const lineValid = line && careerPeriodOrder(line[3]) !== null;
  const rawPeriod = source.period ?? (lineValid ? line[3] : "");
  const order = careerPeriodOrder(rawPeriod);
  return {
    title: (source.title || (lineValid ? line[2] : source.text)).replace(/\s*\/\s*/g, " / "),
    detail: source.part || (lineValid ? line[4] ?? "" : ""),
    genre: source.genre || (lineValid ? line[1] : ""),
    period: order === null ? "기간 미확인" : formatCareerPeriod(rawPeriod),
    rawPeriod, company: source.company ?? "", sourceText: source.text, order,
  };
}
export function latestCareers(sources: readonly DisplayCareerSource[], limit = 5): DisplayCareer[] {
  return sources.map((source, index) => ({ ...careerDisplay(source), index }))
    .sort((a, b) => a.order === b.order ? a.index - b.index : a.order === null ? 1 : b.order === null ? -1 : b.order > a.order ? 1 : -1)
    .slice(0, limit);
}

import type { CareerEntry } from "./types";
import { MAX_PROFILE_CAREER_COUNT, PROFILE_CAREER_GENRES } from "./career-genre";
import { careerIdentity, type CareerIdentity } from "./career-identity";

/** 기존 프로필을 보존하고, 지원서의 새 경력만 미분류로 덧붙인다. 초과 수는 중복을 제외한다. */
export function mergeProfileCareers(current: readonly CareerEntry[], submitted: readonly CareerIdentity[]) {
  const careers = [...current];
  const seen = new Set(current.map(careerIdentity));
  let skippedCareerCount = 0;
  for (const career of submitted) {
    const key = careerIdentity(career);
    if (seen.has(key)) continue;
    seen.add(key);
    if (careers.length >= MAX_PROFILE_CAREER_COUNT) {
      skippedCareerCount += 1;
      continue;
    }
    careers.push({ year: Number(career.year), month: Number(career.month) || null, title: career.title.trim(), part: career.part.trim(), genre: null });
  }
  return { careers, skippedCareerCount };
}

export type CareerInputField = "year" | "month" | "title" | "part" | "genre";
export type ProfileCareerIssue = { readonly message: string; readonly index: number | null; readonly field: CareerInputField | null };

export function profileCareersError(value: unknown, previous: readonly CareerEntry[] = []): string | null {
  return profileCareerIssue(value, previous)?.message ?? null;
}

export function profileCareerIssue(value: unknown, previous: readonly CareerEntry[] = []): ProfileCareerIssue | null {
  if (!Array.isArray(value)) return { message: "경력 목록을 확인해 주세요.", index: null, field: null };
  if (value.length > MAX_PROFILE_CAREER_COUNT) return { message: "경력은 최대 30개까지 저장할 수 있습니다.", index: null, field: null };
  const legacy = previous.filter((career) => career.month == null).map(legacyCareerKey);
  for (const [index, career] of value.entries()) {
    const issue = (field: CareerInputField, message: string): ProfileCareerIssue => ({ index, field, message: `경력 ${index + 1} · ${message}` });
    if (typeof career !== "object" || career === null) return issue("year", "경력 내용을 확인해 주세요.");
    if (!Number.isInteger(career.year) || career.year < 1000 || career.year > 9999) return issue("year", "연도를 네 자리로 입력해 주세요.");
    if (typeof career.title !== "string" || !career.title.trim()) return issue("title", "작품명을 입력해 주세요.");
    if (typeof career.part !== "string" || !career.part.trim()) return issue("part", "배역을 입력해 주세요.");
    if (career.genre != null && !PROFILE_CAREER_GENRES.some((genre) => genre.value === career.genre)) return issue("genre", "장르를 확인해 주세요.");
    if (career.month == null) {
      const retained = legacy.indexOf(legacyCareerKey(career));
      if (retained < 0) return issue("month", "추가하거나 수정한 경력의 월을 선택해 주세요.");
      legacy.splice(retained, 1);
    } else if (!Number.isInteger(career.month) || career.month < 1 || career.month > 12) {
      return issue("month", "경력 월은 1~12 중에서 선택해 주세요.");
    }
  }
  return null;
}

function legacyCareerKey(career: CareerEntry) {
  return JSON.stringify([career.year, career.title.trim(), career.part.trim(), career.genre ?? null]);
}

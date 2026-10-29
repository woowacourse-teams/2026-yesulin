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
    careers.push({ year: Number(career.year), title: career.title.trim(), part: career.part.trim(), genre: null });
  }
  return { careers, skippedCareerCount };
}

export function profileCareersError(value: unknown): string | null {
  if (!Array.isArray(value)) return "경력 목록을 확인해 주세요.";
  if (value.length > MAX_PROFILE_CAREER_COUNT) return "경력은 최대 30개까지 저장할 수 있습니다.";
  const valid = value.every((career) => typeof career === "object" && career !== null
    && Number.isInteger(career.year) && career.year >= 1000 && career.year <= 9999
    && typeof career.title === "string" && Boolean(career.title.trim())
    && typeof career.part === "string" && Boolean(career.part.trim())
    && (career.genre == null || PROFILE_CAREER_GENRES.some((genre) => genre.value === career.genre)));
  return valid ? null : "경력의 연도·작품명·배역·장르를 확인해 주세요.";
}

import type { CareerEntry } from "./types";

const FEATURED_CAREER_COUNT = 3;

export function orderedCareersByRecency(careers: readonly CareerEntry[]): readonly CareerEntry[] {
  return careers
    .map((career, index) => ({ career, index }))
    .sort((left, right) => right.career.year - left.career.year || left.index - right.index)
    .map(({ career }) => career);
}

export function featuredCareers(careers: readonly CareerEntry[]): readonly CareerEntry[] {
  return orderedCareersByRecency(careers).slice(0, FEATURED_CAREER_COUNT);
}

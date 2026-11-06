import { compareCareerRecency } from "@/features/applicants/career-identity";
import type { CareerEntry } from "./types";

const FEATURED_CAREER_COUNT = 3;

export function orderedCareersByRecency(careers: readonly CareerEntry[]): readonly CareerEntry[] {
  return careers
    .map((career, index) => ({ career, index }))
    .sort((left, right) => compareCareerRecency(left.career, right.career) || left.index - right.index)
    .map(({ career }) => career);
}

export function featuredCareers(careers: readonly CareerEntry[]): readonly CareerEntry[] {
  return orderedCareersByRecency(careers).slice(0, FEATURED_CAREER_COUNT);
}

import type { CareerEntry } from "@/features/applicants/types";
import { sameCareer, compareCareerRecency } from "@/features/applicants/career-identity";
import type { CareerDraft } from "./application-form-state";

export const MAX_APPLICATION_CAREERS = 10;

export function applicationCareersFromProfile(profileCareers: readonly CareerEntry[]): CareerDraft[] {
  return profileCareers
    .map((career, index) => ({ career, index }))
    .sort((left, right) => compareCareerRecency(left.career, right.career) || left.index - right.index)
    .slice(0, MAX_APPLICATION_CAREERS)
    .map(({ career, index }) => ({
      id: `prefill-career-${index}`, title: career.title, part: career.part, year: String(career.year), month: career.month ? String(career.month) : "",
    }));
}

export function profileCareerChoices(profileCareers: readonly CareerEntry[], selected: readonly CareerDraft[]) {
  return profileCareers.filter((career) => !selected.some((candidate) => sameCareer(career, candidate)));
}

export function appendProfileCareer(selected: readonly CareerDraft[], career: CareerEntry, id: string) {
  if (selected.length >= MAX_APPLICATION_CAREERS || selected.some((candidate) => sameCareer(career, candidate))) return selected;
  return [...selected, { id, year: String(career.year), month: career.month ? String(career.month) : "", title: career.title, part: career.part }];
}

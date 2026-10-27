import type { CareerEntry } from "@/features/applicants/types";
import { sameCareer } from "@/features/applicants/career-identity";
import type { CareerDraft } from "./application-form-state";

export const MAX_APPLICATION_CAREERS = 10;

export function applicationCareersFromProfile(profileCareers: readonly CareerEntry[]): CareerDraft[] {
  return profileCareers
    .map((career, index) => ({ career, index }))
    .sort((left, right) => right.career.year - left.career.year || left.index - right.index)
    .slice(0, MAX_APPLICATION_CAREERS)
    .map(({ career, index }) => ({
      id: `prefill-career-${index}`, title: career.title, part: career.part, year: String(career.year),
    }));
}

export function profileCareerChoices(profileCareers: readonly CareerEntry[], selected: readonly CareerDraft[]) {
  return profileCareers.filter((career) => !selected.some((candidate) => sameCareer(career, candidate)));
}

export function appendProfileCareer(selected: readonly CareerDraft[], career: CareerEntry, id: string) {
  if (selected.length >= MAX_APPLICATION_CAREERS || selected.some((candidate) => sameCareer(career, candidate))) return selected;
  return [...selected, { id, year: String(career.year), title: career.title, part: career.part }];
}

import type { PdfApplicantProfile } from "../pdf-extractions/types";

/** Full birth dates only: partial dates never manufacture a birthday or exact age. */
export function displayAge(profile: PdfApplicantProfile | null | undefined, today = new Date()): string {
  if (profile?.age.value) return `${profile.age.value} (지원서 기재)`;
  const raw = profile?.birthDate.value?.trim();
  const match = raw?.match(/^(\d{4})[.년/\-]\s*(\d{1,2})[.월/\-]\s*(\d{1,2})[.일]?$/);
  if (!match) return "미확인";
  const [, y, m, d] = match.map(Number);
  const birth = new Date(y, m - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d || birth > today) return "미확인";
  const age = today.getFullYear() - y - (today.getMonth() < m - 1 || today.getMonth() === m - 1 && today.getDate() < d ? 1 : 0);
  return age >= 0 && age <= 120 ? `만 ${age}세` : "미확인";
}

import type { ApplicantProfileResponse, CareerEntry } from "@/features/applicants/types";
import { eventRoutes, MAX_REGISTRATION_CAREERS, type EventSnsPlatform } from "./types";
import { emptyCareer, emptyRegistrationDraft, formatPhoneInput, registrationSnsProblem, type RegistrationDraft } from "./registration-draft";

/** 프로필은 초깃값이다. 신청서에서 이미 수정한 값과 개인정보 동의는 덮어쓰지 않는다. */
export function prefillEventRegistration(current: RegistrationDraft, profile: ApplicantProfileResponse): RegistrationDraft {
  const answers = new Map(profile.answers.map(answer => [answer.key, answer.value]));
  const text = (key: string) => typeof answers.get(key) === "string" ? answers.get(key) as string : "";
  const rawCareers = answers.get("CAREER");
  const careers = Array.isArray(rawCareers) ? rawCareers.filter((entry): entry is CareerEntry => typeof entry === "object" && entry !== null && "year" in entry && "title" in entry && "part" in entry) : [];
  const links = answers.get("LINK");
  const sns = Array.isArray(links) ? links.filter((value): value is string => typeof value === "string").map(snsFromProfileLink).find(Boolean) : null;
  const hasCareer = current.careers.some(career => career.year || career.month || career.workTitle || career.role);
  return {
    ...current, participantType: "ACTOR", businessCardRequested: true,
    name: current.name || text("NAME"), phone: current.phone || formatPhoneInput(text("PHONE")),
    email: current.email || text("EMAIL"), birthDate: current.birthDate || text("BIRTH"),
    ...(!current.snsHandle && !current.snsPlatform && sns ? sns : {}),
    careers: hasCareer || current.noCareer ? current.careers : careers.length ? careers.slice(0, MAX_REGISTRATION_CAREERS).map((career, index) => ({
      key: index + 1, year: String(career.year), month: "", workTitle: career.title, role: career.part,
    })) : [emptyCareer(1)],
  };
}

export function snsFromProfileLink(value: string): { snsPlatform: EventSnsPlatform; snsHandle: string } | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    let snsPlatform: EventSnsPlatform;
    let snsHandle: string;
    if (host === "instagram.com" && parts.length === 1 && !["p", "reel", "reels", "stories", "explore"].includes(parts[0])) {
      snsPlatform = "INSTAGRAM"; snsHandle = parts[0].replace(/^@/, "");
    } else if (["threads.net", "threads.com"].includes(host) && parts.length === 1 && parts[0].startsWith("@")) {
      snsPlatform = "THREADS"; snsHandle = parts[0].slice(1);
    } else if (host === "youtube.com" && parts.length === 1 && parts[0].startsWith("@")) {
      snsPlatform = "YOUTUBE"; snsHandle = parts[0];
    } else return null;
    return registrationSnsProblem(snsPlatform, snsHandle) ? null : { snsPlatform, snsHandle };
  } catch { return null; }
}

export function eventProfileEditorPath(eventId: number) {
  return `/applicants/profile?eventId=${eventId}`;
}
export const eventProfileReturnPath = (eventId: number) => `${eventRoutes.register(eventId)}?prefill=1`;

const key = (eventId: number) => `yesulin:event-profile-draft:${eventId}`;
export function rememberEventRegistration(eventId: number, draft: RegistrationDraft, photoUrl: string | null) {
  sessionStorage.setItem(key(eventId), JSON.stringify({ draft, photoUrl, expiresAt: Date.now() + 60 * 60 * 1000 }));
}
export function consumeEventRegistration(eventId: number): { draft: RegistrationDraft; photoUrl: string | null } | null {
  try {
    const raw = sessionStorage.getItem(key(eventId));
    sessionStorage.removeItem(key(eventId));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.expiresAt < Date.now() || !value.draft || !Array.isArray(value.draft.careers) || !Array.isArray(value.draft.activityFields)) return null;
    return { draft: { ...emptyRegistrationDraft(), ...value.draft }, photoUrl: typeof value.photoUrl === "string" && value.photoUrl.startsWith("data:image/") ? value.photoUrl : null };
  } catch { return null; }
}

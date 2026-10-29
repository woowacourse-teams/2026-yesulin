import type { AdminEventRegistration } from "@/features/admin/types";
import { emptyRegistrationDraft, type RegistrationDraft } from "./registration-draft";

/** 신청서에 표시하는 예시 QR과 실제 발급 QR을 구분하기 위해 저장된 신청에서만 원고를 만든다. */
export function registeredBusinessCardDraft(registration: AdminEventRegistration): RegistrationDraft {
  return {
    ...emptyRegistrationDraft(),
    participantType: registration.participantType,
    name: registration.name,
    email: registration.email ?? "",
    snsHandle: registration.snsHandle ?? "",
    snsPlatform: registration.snsPlatform ?? "",
    birthDate: registration.birthDate ?? "",
    intro: registration.intro ?? "",
    businessCardRequested: registration.businessCardRequested,
    activityFields: registration.activityFields,
    otherActivity: registration.otherActivity ?? "",
    noCareer: registration.noCareer,
    careers: registration.careers.map((career, index) => ({
      key: index, year: career.performedMonth.slice(0, 4), month: career.performedMonth.slice(5, 7),
      workTitle: career.workTitle, role: career.role ?? "",
    })),
  };
}

export function businessCardProfileUrlProblem(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (normalized.length > 2000 || Array.from(normalized).some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
      || url.protocol !== "https:" || !url.hostname || url.username || url.password || /^\/(?:n|events\/cards)(?:\/|$)/i.test(decodeURIComponent(url.pathname))) {
      return "공개 프로필의 HTTPS 주소를 입력해 주세요.";
    }
  } catch {
    return "공개 프로필의 HTTPS 주소를 입력해 주세요.";
  }
  return null;
}

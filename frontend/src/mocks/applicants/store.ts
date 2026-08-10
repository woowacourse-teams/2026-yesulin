import { defaultApplicationFields } from "@/features/auditions/creation-types";
import { applicationId } from "@/features/auditions/types";
import type { ApplicationId } from "@/features/auditions/types";
import type {
  ApplicantAnswer,
  ApplicantApplicationDetail,
  ApplicantApplicationSummary,
  ApplicantProfileResponse,
  LookupApplicationResponse,
  RecommendedPosting,
  UpdateApplicationRequest,
  UpdateProfileRequest,
} from "@/features/applicants/types";

const now = "2026-08-07T09:12:00+09:00";

let profileAnswers: ApplicantAnswer[] = [
  { key: "NAME", label: "이름", value: "김서윤", updatedAt: now },
  { key: "PHONE", label: "연락처", value: "010-1766-2070", updatedAt: now },
  { key: "BIRTH", label: "생년월일", value: "1998-04-17", updatedAt: now },
  { key: "GENDER", label: "성별", value: "여성", updatedAt: now },
  { key: "BODY", label: "키·몸무게", value: { height: 167, weight: 52 }, updatedAt: now },
  { key: "SCHOOL", label: "학교·전공", value: "한국예술종합학교 연극원 연기과", updatedAt: now },
  { key: "CAREER", label: "주요 경력", value: [
    { year: 2025, title: "연극 <밤의 끝>", part: "주연" },
    { year: 2024, title: "뮤지컬 <푸른 달>", part: "앙상블" },
  ], updatedAt: now },
  { key: "COVER_LETTER", label: "자기소개", value: "무대 위에서 인물의 선택이 관객에게 오래 남는 순간을 만들고 싶은 배우 김서윤입니다. 장면의 목적을 정확히 찾고 동료와 호흡하는 과정을 중요하게 생각합니다.", updatedAt: now },
  { key: "PHOTOS", label: "프로필 사진", value: ["f_8102", "f_8103"], previewUrls: ["https://i.pravatar.cc/600?img=47", "https://i.pravatar.cc/600?img=45"], updatedAt: now },
  { key: "VIDEO", label: "연기 영상", value: "https://youtu.be/dQw4w9WgXcQ", updatedAt: now },
  { key: "custom-specialty", label: "특기", value: "현대무용, 피아노", custom: true, lastUsedPostingTitle: "HIGH LIFE - Audition", updatedAt: now },
];

const formFields = defaultApplicationFields().map((field) => ({ ...field, enabled: true }));

let applications: ApplicantApplicationDetail[] = [
  {
    id: applicationId(500),
    postingId: "po1",
    performanceTitle: "연극 <HIGH LIFE>",
    postingTitle: "HIGH LIFE - Audition",
    posterUrl: "/images/performances/high-life-audition-2026.jpg",
    companyName: "나인진엔터테인먼트",
    roleId: "po1_r2",
    roleName: "여자 배우",
    lookupCode: "YS-20260806-73D9DE",
    submittedAt: "2026-08-06T18:33:17+09:00",
    updatedAt: now,
    editable: true,
    recruitmentEnd: "2026-08-09",
    editableUntil: "2026-08-09T23:59:59+09:00",
    answers: profileAnswers.filter((answer) => answer.key !== "MOTIVATION"),
    applicationFields: [...formFields, {
      id: "custom-specialty", label: "특기", enabled: true, required: false, custom: true,
      section: "CUSTOM", inputType: "TEXT", order: 10, layout: "FULL", config: {},
    }],
  },
  {
    id: applicationId(421),
    postingId: "po3",
    performanceTitle: "연극 <햄릿의 변호사>",
    postingTitle: "햄릿 역 오디션",
    posterUrl: "/images/performances/moonlight.jpg",
    companyName: "나인진엔터테인먼트",
    roleId: "po3_r1",
    roleName: "햄릿",
    lookupCode: "YS-20260528-1A2B3C",
    submittedAt: "2026-05-28T14:20:00+09:00",
    updatedAt: "2026-05-28T14:20:00+09:00",
    editable: false,
    recruitmentEnd: "2026-05-31",
    editableUntil: "2026-05-31T23:59:59+09:00",
    answers: profileAnswers.filter((answer) => !answer.custom),
    applicationFields: formFields,
  },
];
const ownedApplicationIds = new Set<ApplicationId>(applications.map((application) => application.id));
const claims = new Map<string, { readonly applicationId: ApplicationId; readonly expiresAt: string; used: boolean }>();

const recommendations: readonly RecommendedPosting[] = [
  { id: "po1", performanceTitle: "연극 <HIGH LIFE>", title: "HIGH LIFE - Audition", companyName: "나인진엔터테인먼트", status: "OPEN", recruitmentStart: "2026-07-27", recruitmentEnd: "2026-08-09" },
  { id: "po5", performanceTitle: "연극 <행오버>", title: "2026 하반기 팀 오디션", companyName: "나인진엔터테인먼트", status: "UPCOMING", recruitmentStart: "2026-08-07", recruitmentEnd: "2026-09-19" },
  { id: "po3", performanceTitle: "연극 <햄릿의 변호사>", title: "햄릿 역 오디션", companyName: "나인진엔터테인먼트", status: "CLOSED", recruitmentStart: "2026-05-21", recruitmentEnd: "2026-05-31" },
];

const clone = <T>(value: T): T => structuredClone(value);

export function applicantProfile(): ApplicantProfileResponse {
  const standardTotal = 11;
  return { answers: clone(profileAnswers), completeness: { filled: profileAnswers.filter((answer) => !answer.custom).length, standardTotal } };
}

export function patchApplicantProfile(body: UpdateProfileRequest): ApplicantProfileResponse {
  const remove = new Set(body.removeKeys ?? []);
  profileAnswers = profileAnswers.filter((answer) => !remove.has(answer.key));
  for (const next of body.answers ?? []) {
    const current = profileAnswers.find((answer) => answer.key === next.key);
    const answer: ApplicantAnswer = { ...current, ...next, label: next.label ?? current?.label ?? next.key, updatedAt: new Date().toISOString() };
    profileAnswers = current
      ? profileAnswers.map((candidate) => candidate.key === next.key ? answer : candidate)
      : [...profileAnswers, answer];
  }
  return applicantProfile();
}

function toSummary(detail: ApplicantApplicationDetail): ApplicantApplicationSummary {
  return {
    id: detail.id,
    postingId: detail.postingId,
    performanceTitle: detail.performanceTitle,
    postingTitle: detail.postingTitle,
    posterUrl: detail.posterUrl,
    companyName: detail.companyName,
    roleName: detail.roleName,
    lookupCode: detail.lookupCode,
    submittedAt: detail.submittedAt,
    editable: detail.editable,
    recruitmentEnd: detail.recruitmentEnd,
  };
}

export const applicantApplications = () => ({ applications: clone(applications.filter((application) => ownedApplicationIds.has(application.id)).map(toSummary)) });

export const applicantApplication = (id: ApplicationId) => {
  const detail = ownedApplicationIds.has(id) ? applications.find((application) => application.id === id) : undefined;
  return detail ? clone(detail) : null;
};

export function patchApplicantApplication(id: ApplicationId, body: UpdateApplicationRequest) {
  const current = applications.find((application) => application.id === id);
  if (!current) return null;
  const changed = new Map(body.answers.map((answer) => [answer.key, answer.value]));
  const currentKeys = new Set(current.answers.map((answer) => answer.key));
  const answers = [
    ...current.answers.map((answer) => changed.has(answer.key) ? { ...answer, value: changed.get(answer.key)! } : answer),
    ...body.answers.filter((answer) => !currentKeys.has(answer.key)).map((answer) => ({
      key: answer.key,
      label: current.applicationFields.find((field) => field.id === answer.key)?.label ?? answer.key,
      value: answer.value,
    })),
  ];
  applications = applications.map((application) => application.id === id ? { ...application, answers, updatedAt: new Date().toISOString() } : application);
  return applicantApplication(id);
}

export const recommendedPostings = (exclude?: string, limit = 3) => clone(recommendations.filter((posting) => posting.id !== exclude).slice(0, limit));

export function lookupApplicantApplication(code: string, phone: string): LookupApplicationResponse | null {
  const normalized = code.replaceAll("-", "").toUpperCase();
  const found = applications.find((application) => application.lookupCode.replaceAll("-", "").toUpperCase() === normalized);
  const savedPhone = found?.answers.find((answer) => answer.key === "PHONE")?.value;
  if (!found || typeof savedPhone !== "string" || savedPhone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) return null;
  return clone({
    lookupCode: found.lookupCode,
    performanceTitle: found.performanceTitle,
    postingTitle: found.postingTitle,
    companyName: found.companyName,
    roleName: found.roleName,
    submittedAt: found.submittedAt,
    postingStatus: found.editable ? "OPEN" : "CLOSED",
    editable: found.editable,
    editableUntil: found.editableUntil,
    answers: found.answers,
  });
}

export function addApplicantApplication(detail: ApplicantApplicationDetail) {
  applications = [detail, ...applications];
}

export function registerProfileClaim(token: string, applicationId: ApplicationId, expiresAt: string) {
  claims.set(token, { applicationId, expiresAt, used: false });
}

/** 유효한 1회용 토큰이면 지원서 소유권과 표준 프로필 스냅샷을 함께 귀속한다. */
export function claimApplicantApplication(token?: string): ApplicationId | null {
  if (!token) return null;
  const claim = claims.get(token);
  if (!claim || claim.used || Date.parse(claim.expiresAt) <= Date.now()) return null;
  const application = applications.find((candidate) => candidate.id === claim.applicationId);
  if (!application) return null;
  claim.used = true;
  ownedApplicationIds.add(application.id);
  const standard = application.answers.filter((answer) => !answer.custom && !answer.key.startsWith("cf_"));
  for (const answer of standard) {
    const current = profileAnswers.find((candidate) => candidate.key === answer.key);
    const next = { ...answer, updatedAt: new Date().toISOString() };
    profileAnswers = current
      ? profileAnswers.map((candidate) => candidate.key === answer.key ? next : candidate)
      : [...profileAnswers, next];
  }
  return application.id;
}

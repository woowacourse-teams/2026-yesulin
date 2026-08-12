import { applicationId, type ApplicationId } from "@/features/auditions/types";
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
import { CATALOG } from "@/mocks/auditions/catalog";
import { defaultApplicationFields } from "@/features/auditions/creation-types";
import { producerProfile } from "@/mocks/auditions/producer-profile";

const seededAnswers: ApplicantAnswer[] = [
  { key: "NAME", label: "이름", value: "김하린" },
  { key: "PHONE", label: "연락처", value: "010-2468-1357" },
  { key: "EMAIL", label: "이메일", value: "harin.kim@example.com" },
  { key: "ADDRESS", label: "거주지", value: "서울특별시 마포구" },
  { key: "BIRTH", label: "생년월일", value: "1999-04-18" },
  { key: "GENDER", label: "성별", value: "여성" },
  { key: "BODY", label: "키·몸무게", value: { height: 166, weight: 52 } },
  { key: "CAREER", label: "주요 경력", value: [{ year: 2025, title: "푸른 방", part: "윤서" }] },
  { key: "COVER_LETTER", label: "자기소개", value: "인물의 작은 선택이 장면 전체의 온도를 바꾼다고 믿습니다. 상대 배우의 호흡을 세심하게 듣고 반복되는 연습에서도 새로운 반응을 발견하는 배우 김하린입니다." },
  { key: "PHOTOS", label: "프로필 사진", value: ["seed-photo-1"], previewUrls: ["/images/performances/high-life-audition-2026.jpg"] },
  { key: "VIDEO", label: "연기 영상", value: "https://youtu.be/dQw4w9WgXcQ" },
];
let profileAnswers: ApplicantAnswer[] = seededAnswers.filter((answer) => !answer.custom);
let applications: ApplicantApplicationDetail[] = [{
  id: applicationId(26081201), postingId: "seed_posting_1", performanceTitle: "달빛 아래 우리", postingTitle: "2026 하반기 주·조연 배우 모집",
  posterUrl: "/images/performances/moonlight.jpg", companyName: "예술in 스테이지", roleId: "seed_role_seoyeon", roleIds: ["seed_role_seoyeon", "seed_role_jiwoo"], roleName: "서연 · 지우",
  lookupCode: "YS-20260812-SEED01", submittedAt: "2026-08-12T10:30:00+09:00", updatedAt: "2026-08-12T10:30:00+09:00",
  editable: false, recruitmentEnd: "2026-09-30", editableUntil: "", answers: seededAnswers, applicationFields: defaultApplicationFields(),
}];
const ownedApplicationIds = new Set<ApplicationId>(applications.map((application) => application.id));
const claims = new Map<string, { readonly applicationId: ApplicationId; readonly expiresAt: string; used: boolean }>();

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

export function recommendedPostings(exclude?: string, limit = 3): readonly RecommendedPosting[] {
  const companyName = producerProfile().companyName || "공연사";
  return CATALOG.flatMap((performance) => performance.postings.map((posting) => ({
    id: posting.id,
    performanceTitle: performance.title,
    title: posting.title,
    companyName,
    status: posting.status,
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
  })))
    .filter((posting) => posting.id !== exclude)
    .slice(0, limit);
}

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
  ownedApplicationIds.add(detail.id);
}

export const hasApplicationForPosting = (postingId: string) =>
  applications.some((application) => ownedApplicationIds.has(application.id) && application.postingId === postingId);

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

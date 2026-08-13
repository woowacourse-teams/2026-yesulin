import type { ApplicationId } from "@/features/auditions/types";
import type {
  ApplicantAnswer,
  ApplicantApplicationDetail,
  ApplicantApplicationSummary,
  ApplicantProfileResponse,
  RecommendedPosting,
  UpdateProfileRequest,
} from "@/features/applicants/types";
import { CATALOG } from "@/mocks/auditions/catalog";
import { producerProfile } from "@/mocks/auditions/producer-profile";

let profileAnswers: ApplicantAnswer[] = [];
let applications: ApplicantApplicationDetail[] = [];
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

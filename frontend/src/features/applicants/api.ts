import type {
  ApplicantAnswer,
  ApplicantAnswerValue,
  ApplicantApplicationDetail,
  ApplicantApplicationListResponse,
  ApplicantProfileResponse,
  ProfilePrefillResponse,
  RecommendedPostingResponse,
  SubmitApplicationRequest,
  SubmitApplicationResponse,
  UpdateProfileRequest,
} from "./types";
import type { PublicPosting } from "@/features/applications/public-posting";
import type { ApplicationId } from "@/features/auditions/types";
import { ApiError, apiRequest } from "@/lib/api-client";
import { toPublicPosting, type PublicPostingApiResponse } from "@/features/applications/public-posting-api";

type ApplicantProfileApiResponse = {
  readonly applicantId: number;
  readonly activityName: string | null;
  readonly name: string | null;
  readonly height: number | null;
  readonly weight: number | null;
  readonly birthDate: string | null;
  readonly gender: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly residence: string | null;
  readonly additionalInformation: Readonly<Record<string, ApplicantAnswerValue>>;
  readonly photoUrls: readonly string[];
  readonly consentedAt: string | null;
  readonly updatedAt: string | null;
};

type ApplicantProfileApiRequest = Omit<ApplicantProfileApiResponse, "applicantId" | "consentedAt" | "updatedAt"> & {
  readonly profileSaveConsent: boolean;
};

const LABELS: Readonly<Record<string, string>> = {
  NAME: "이름",
  PHONE: "연락처",
  BIRTH: "생년월일",
  GENDER: "성별",
  BODY: "키·몸무게",
  EMAIL: "이메일",
  RESIDENCE: "거주지",
  SCHOOL: "학교·전공",
  CAREER: "주요 경력",
  COVER_LETTER: "자기소개",
  MOTIVATION: "지원 동기",
  PHOTOS: "프로필 사진",
  VIDEO: "연기 영상",
};

function hasValue(value: ApplicantAnswerValue | null | undefined): value is ApplicantAnswerValue {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function profileAnswer(key: string, value: ApplicantAnswerValue | null | undefined, updatedAt: string | null): ApplicantAnswer | null {
  if (!hasValue(value)) return null;
  return { key, label: LABELS[key] ?? key, value, updatedAt: updatedAt ?? undefined };
}

function toProfileView(response: ApplicantProfileApiResponse): ApplicantProfileResponse {
  const standard = [
    profileAnswer("NAME", response.name, response.updatedAt),
    profileAnswer("PHONE", response.phone, response.updatedAt),
    profileAnswer("BIRTH", response.birthDate, response.updatedAt),
    profileAnswer("GENDER", response.gender, response.updatedAt),
    profileAnswer("BODY", response.height && response.weight ? { height: response.height, weight: response.weight } : null, response.updatedAt),
    profileAnswer("EMAIL", response.email, response.updatedAt),
    profileAnswer("RESIDENCE", response.residence, response.updatedAt),
    profileAnswer("PHOTOS", response.photoUrls, response.updatedAt),
  ].filter((answer): answer is ApplicantAnswer => answer !== null);
  const additional = Object.entries(response.additionalInformation)
    .map(([key, value]) => profileAnswer(key, value, response.updatedAt))
    .filter((answer): answer is ApplicantAnswer => answer !== null);
  const answers = [...standard, ...additional];
  return { answers, completeness: { filled: answers.length, standardTotal: Object.keys(LABELS).length } };
}

function answerMap(profile: ApplicantProfileApiResponse) {
  const view = toProfileView(profile);
  return new Map(view.answers.map((answer) => [answer.key, answer.value]));
}

function toProfileRequest(current: ApplicantProfileApiResponse, update: UpdateProfileRequest): ApplicantProfileApiRequest {
  const values = answerMap(current);
  for (const key of update.removeKeys ?? []) values.delete(key);
  for (const answer of update.answers ?? []) values.set(answer.key, answer.value);
  const body = values.get("BODY");
  const additionalInformation = Object.fromEntries(
    [...values].filter(([key]) => !["NAME", "PHONE", "BIRTH", "GENDER", "BODY", "EMAIL", "RESIDENCE", "PHOTOS"].includes(key)),
  );
  return {
    activityName: current.activityName,
    name: typeof values.get("NAME") === "string" ? values.get("NAME") as string : null,
    height: typeof body === "object" && body !== null && !Array.isArray(body) && "height" in body ? body.height : null,
    weight: typeof body === "object" && body !== null && !Array.isArray(body) && "weight" in body ? body.weight : null,
    birthDate: typeof values.get("BIRTH") === "string" ? values.get("BIRTH") as string : null,
    gender: typeof values.get("GENDER") === "string" ? values.get("GENDER") as string : null,
    phone: typeof values.get("PHONE") === "string" ? values.get("PHONE") as string : null,
    email: typeof values.get("EMAIL") === "string" ? values.get("EMAIL") as string : null,
    residence: typeof values.get("RESIDENCE") === "string" ? values.get("RESIDENCE") as string : null,
    additionalInformation,
    photoUrls: Array.isArray(values.get("PHOTOS")) ? values.get("PHOTOS") as readonly string[] : [],
    profileSaveConsent: true,
  };
}

const getProfileApi = () => apiRequest<ApplicantProfileApiResponse>("/applicants/me/profile");

export async function getApplicantProfile() {
  return toProfileView(await getProfileApi());
}

export async function updateApplicantProfile(body: UpdateProfileRequest) {
  const current = await getProfileApi();
  const updated = await apiRequest<ApplicantProfileApiResponse>("/applicants/me/profile", {
    method: "PATCH",
    body: JSON.stringify(toProfileRequest(current, body)),
  });
  return toProfileView(updated);
}

export const getProfilePrefill = (postingId: string) => apiRequest<ProfilePrefillResponse>(`/applicants/me/profile/prefill?postingId=${encodeURIComponent(postingId)}`);

type RawApplicationSummary = { readonly id: number; readonly postingId: number; readonly submittedAt: string };
type RawApplicationDetail = RawApplicationSummary & { readonly snapshotSchemaVersion: string; readonly snapshotJson: string };
type SubmissionSnapshot = { readonly roles?: readonly { readonly id: number; readonly name: string }[]; readonly answers?: readonly { readonly key: string; readonly label: string; readonly value: ApplicantAnswerValue }[] };

async function applicationView(summary: RawApplicationSummary): Promise<ApplicantApplicationDetail> {
  const [posting, detail] = await Promise.all([
    getPublicPosting(String(summary.postingId)),
    apiRequest<RawApplicationDetail>(`/applicants/me/applications/${summary.id}`),
  ]);
  const snapshot = JSON.parse(detail.snapshotJson) as SubmissionSnapshot;
  const roles = snapshot.roles ?? [];
  return {
    id: summary.id as ApplicationId,
    postingId: String(summary.postingId),
    performanceTitle: posting.performanceTitle,
    postingTitle: posting.title,
    posterUrl: posting.posterUrl,
    companyName: posting.companyName,
    roleId: String(roles[0]?.id ?? ""),
    roleName: roles.map((role) => role.name).join(", "),
    lookupCode: `YS-${String(summary.id).padStart(8, "0")}`,
    submittedAt: summary.submittedAt,
    updatedAt: summary.submittedAt,
    editable: false,
    recruitmentEnd: posting.recruitmentEnd,
    editableUntil: posting.recruitmentEnd,
    answers: (snapshot.answers ?? []).map((answer) => ({ key: answer.key, label: answer.label, value: answer.value })),
    applicationFields: posting.applicationFields,
  };
}

export async function getApplicantApplications(): Promise<ApplicantApplicationListResponse> {
  const summaries = await apiRequest<readonly RawApplicationSummary[]>("/applicants/me/applications");
  const details = await Promise.all(summaries.map(applicationView));
  return { applications: details };
}

export async function getApplicantApplication(applicationId: ApplicationId) {
  const detail = await apiRequest<RawApplicationDetail>(`/applicants/me/applications/${applicationId}`);
  return applicationView(detail);
}

export const getRecommendedPostings = (excludePostingId?: string, limit = 3) => {
  const query = new URLSearchParams({ limit: String(limit) });
  if (excludePostingId) query.set("excludePostingId", excludePostingId);
  return apiRequest<{ readonly postings: readonly {
    readonly id: number;
    readonly performanceTitle: string;
    readonly title: string;
    readonly companyName: string;
    readonly status: "OPEN" | "UPCOMING" | "CLOSED";
    readonly recruitmentStartsAt: string;
    readonly recruitmentEndsAt: string;
  }[] }>(`/public/recommended-postings?${query}`).then((response): RecommendedPostingResponse => ({
    postings: response.postings.map((posting) => ({
      ...posting,
      id: String(posting.id),
      recruitmentStart: posting.recruitmentStartsAt,
      recruitmentEnd: posting.recruitmentEndsAt,
    })),
  }));
};

export async function getPublicPosting(postingId: string): Promise<PublicPosting> {
  return toPublicPosting(await apiRequest<PublicPostingApiResponse>(`/public/postings/${postingId}`));
}

type DraftApiResponse = {
  readonly id: number;
  readonly postingId: number;
  readonly revision: number;
  readonly clientModifiedAt: string;
  readonly serverModifiedAt: string;
  readonly status: "ACTIVE" | "SUBMITTED";
};

type DraftContent = {
  readonly roleIds: readonly number[];
  readonly answers: SubmitApplicationRequest["answers"];
};

async function synchronizeDraft(postingId: number, content: DraftContent) {
  const synchronize = (expectedRevision: number | null, clientModifiedAt: string) =>
    apiRequest<DraftApiResponse>("/applicants/me/drafts", {
      method: "POST",
      body: JSON.stringify({ postingId, content, expectedRevision, clientModifiedAt }),
    });

  try {
    return await synchronize(null, new Date().toISOString());
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.code !== "DRAFT_REVISION_REQUIRED") throw cause;
    const current = await apiRequest<DraftApiResponse>(`/applicants/me/drafts?postingId=${postingId}`);
    const nextClientModifiedAt = new Date(Math.max(Date.now(), Date.parse(current.clientModifiedAt) + 1)).toISOString();
    return synchronize(current.revision, nextClientModifiedAt);
  }
}

export async function submitPublicApplication(body: SubmitApplicationRequest): Promise<SubmitApplicationResponse> {
  const numericPostingId = Number(body.postingId);
  const draft = await synchronizeDraft(numericPostingId, {
    roleIds: body.roleIds.map(Number),
    answers: body.answers,
  });
  const result = await apiRequest<{ readonly applicationId: number; readonly postingId: number; readonly submittedAt: string }>("/applicants/me/applications", {
    method: "POST",
    body: JSON.stringify({
      draftId: draft.id,
      postingId: numericPostingId,
      roleIds: body.roleIds.map(Number),
      answers: body.answers.map((answer) => ({ key: answer.key, value: answer.value })),
      consent: {
        collectionAndUse: body.collectionAndUseAgreed,
        thirdPartyProvision: body.thirdPartyProvisionAgreed,
        profileSave: false,
      },
    }),
  });
  return {
    applicationId: result.applicationId as ApplicationId,
    receiptNumber: `YS-${String(result.applicationId).padStart(8, "0")}`,
    submittedAt: result.submittedAt,
    profileClaimToken: null,
    profileClaimExpiresAt: null,
  };
}

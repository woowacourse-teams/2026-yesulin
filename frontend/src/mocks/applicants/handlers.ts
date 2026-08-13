import { delay, http, HttpResponse } from "msw";
import { publicPostingById } from "@/features/applications/public-posting";
import { postingId } from "@/features/auditions/types";
import { findPosting } from "../auditions/aggregate";
import { applicantProfile, patchApplicantProfile, recommendedPostings } from "./store";
import type { ApplicantAnswer, ApplicantAnswerValue } from "@/features/applicants/types";
import type { PublicPostingApiResponse } from "@/features/applications/public-posting-api";
import { mockAuthenticationError, mockRequestAuthorized } from "../auth-handlers";

const apiPath = "/api/v1";
const apiError = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });
let nextDraftId = 1;
const drafts = new Map<number, { readonly id: number; readonly postingId: number; readonly content: unknown; readonly revision: number; readonly clientModifiedAt: string; readonly serverModifiedAt: string; readonly status: "ACTIVE" | "SUBMITTED" }>();
const submittedApplications: { readonly id: number; readonly postingId: number; readonly submittedAt: string; readonly snapshotSchemaVersion: string; readonly snapshotJson: string }[] = [];

type ProfileApiResponse = {
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

function viewProfileToApi(): ProfileApiResponse {
  const answers = new Map(applicantProfile().answers.map((answer) => [answer.key, answer.value]));
  const body = answers.get("BODY");
  const reserved = new Set(["NAME", "PHONE", "BIRTH", "GENDER", "BODY", "EMAIL", "RESIDENCE", "PHOTOS"]);
  return {
    applicantId: 1,
    activityName: null,
    name: typeof answers.get("NAME") === "string" ? answers.get("NAME") as string : null,
    height: typeof body === "object" && body !== null && !Array.isArray(body) && "height" in body ? body.height : null,
    weight: typeof body === "object" && body !== null && !Array.isArray(body) && "weight" in body ? body.weight : null,
    birthDate: typeof answers.get("BIRTH") === "string" ? answers.get("BIRTH") as string : null,
    gender: typeof answers.get("GENDER") === "string" ? answers.get("GENDER") as string : null,
    phone: typeof answers.get("PHONE") === "string" ? answers.get("PHONE") as string : null,
    email: typeof answers.get("EMAIL") === "string" ? answers.get("EMAIL") as string : null,
    residence: typeof answers.get("RESIDENCE") === "string" ? answers.get("RESIDENCE") as string : null,
    additionalInformation: Object.fromEntries([...answers].filter(([key]) => !reserved.has(key))),
    photoUrls: Array.isArray(answers.get("PHOTOS")) ? answers.get("PHOTOS") as readonly string[] : [],
    consentedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function apiProfileToAnswers(body: ProfileApiResponse): readonly ApplicantAnswer[] {
  const values: readonly [string, ApplicantAnswerValue | null][] = [
    ["NAME", body.name],
    ["PHONE", body.phone],
    ["BIRTH", body.birthDate],
    ["GENDER", body.gender],
    ["BODY", body.height && body.weight ? { height: body.height, weight: body.weight } : null],
    ["EMAIL", body.email],
    ["RESIDENCE", body.residence],
    ["PHOTOS", body.photoUrls],
    ...Object.entries(body.additionalInformation),
  ];
  return values
    .filter((entry): entry is [string, ApplicantAnswerValue] => entry[1] !== null && entry[1] !== "" && (!Array.isArray(entry[1]) || entry[1].length > 0))
    .map(([key, value]) => ({ key, label: key, value }));
}

function recruitmentPeriod(recruitmentStart: string, recruitmentEnd: string) {
  const start = recruitmentStart.includes("T")
    ? recruitmentStart : `${recruitmentStart}T00:00:00+09:00`;
  const endDate = new Date(`${recruitmentEnd.slice(0, 10)}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = recruitmentEnd.includes("T")
    ? recruitmentEnd : `${endDate.toISOString().slice(0, 10)}T00:00:00+09:00`;
  return { start, end };
}

function publicPostingToApi(posting: NonNullable<ReturnType<typeof publicPostingById>>): PublicPostingApiResponse {
  const period = recruitmentPeriod(posting.recruitmentStart, posting.recruitmentEnd);
  return {
    id: Number(String(posting.id).replace(/\D/g, "")) || 1,
    performance: { id: 1, title: posting.performanceTitle, venue: posting.venue, posterUrl: posting.posterUrl },
    company: { id: 1, name: posting.companyName },
    title: posting.title,
    status: posting.status,
    allowsMultipleRoles: posting.allowsMultipleRoles,
    recruitmentStartsAt: period.start,
    recruitmentEndsAt: period.end,
    applicationGuide: posting.notice,
    roles: posting.roles.map((role, index) => ({
      id: Number(String(role.id).replace(/\D/g, "")) || index + 1,
      name: role.name,
      description: role.description,
      quota: role.quota,
      genderCondition: role.gender,
      ageMin: role.ageMin,
      ageMax: role.ageMax,
    })),
    applicationFields: posting.applicationFields.map((field, index) => ({
      id: index + 1,
      key: field.id,
      label: field.label,
      required: field.required,
      custom: field.custom,
      section: field.section,
      inputType: field.inputType,
      order: field.order,
      config: field.config,
    })),
  };
}

export const applicantHandlers = [
  http.get(`${apiPath}/applicants/me/profile`, async () => { await delay(220); return mockAuthenticationError() ?? HttpResponse.json(viewProfileToApi()); }),
  http.patch(`${apiPath}/applicants/me/profile`, async ({ request }) => {
    await delay(240);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const body = (await request.json()) as ProfileApiResponse;
    const currentKeys = applicantProfile().answers.map((answer) => answer.key);
    patchApplicantProfile({ answers: apiProfileToAnswers(body), removeKeys: currentKeys });
    return HttpResponse.json(viewProfileToApi());
  }),
  http.get(`${apiPath}/applicants/me/profile/prefill`, async ({ request }) => {
    await delay(220);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const posting = findPosting(postingId(new URL(request.url).searchParams.get("postingId") ?? ""));
    if (!posting) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    const profile = applicantProfile();
    const fields = (posting.applicationFields ?? []).filter((field) => field.enabled);
    const keys = new Set(fields.map((field) => field.id));
    const answers = profile.answers.filter((answer) => keys.has(answer.key));
    const answered = new Set(answers.map((answer) => answer.key));
    const required = fields.filter((field) => field.required);
    return HttpResponse.json({ answers, filledCount: required.filter((field) => answered.has(field.id)).length, requiredCount: required.length, missingKeys: required.filter((field) => !answered.has(field.id)).map((field) => field.id) });
  }),
  http.get(`${apiPath}/applicants/me/applications`, async () => { await delay(260); return mockAuthenticationError() ?? HttpResponse.json(submittedApplications.map(({ id, postingId, submittedAt }) => ({ id, postingId, submittedAt }))); }),
  http.get(`${apiPath}/applicants/me/drafts`, async ({ request }) => {
    await delay(120);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const postingId = Number(new URL(request.url).searchParams.get("postingId"));
    const draft = [...drafts.values()].find((item) => item.postingId === postingId);
    return draft ? HttpResponse.json(draft) : apiError(404, "DRAFT_NOT_FOUND", "Draft를 찾을 수 없습니다.");
  }),
  http.post(`${apiPath}/applicants/me/drafts`, async ({ request }) => {
    await delay(180);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const body = await request.json() as { readonly postingId: number; readonly content: unknown; readonly expectedRevision: number | null; readonly clientModifiedAt: string };
    const existing = [...drafts.values()].find((draft) => draft.postingId === body.postingId);
    if (existing) {
      if (existing.status !== "ACTIVE") return apiError(409, "DRAFT_NOT_ACTIVE", "활성 Draft만 변경할 수 있습니다.");
      if (body.expectedRevision === null) return apiError(409, "DRAFT_REVISION_REQUIRED", "기존 Draft를 갱신하려면 revision이 필요합니다.");
      if (body.expectedRevision !== existing.revision || body.clientModifiedAt <= existing.clientModifiedAt) return apiError(409, "DRAFT_VERSION_CONFLICT", "더 최신인 Draft가 이미 저장되어 있습니다.");
      const updated = { ...existing, content: body.content, revision: existing.revision + 1, clientModifiedAt: body.clientModifiedAt, serverModifiedAt: new Date().toISOString() };
      drafts.set(updated.id, updated);
      return HttpResponse.json(updated, { status: 201 });
    }
    if (body.expectedRevision !== null) return apiError(400, "DRAFT_VERSION_CONFLICT", "갱신할 Draft가 존재하지 않습니다.");
    const created = { id: nextDraftId++, postingId: body.postingId, content: body.content, revision: 1, clientModifiedAt: body.clientModifiedAt, serverModifiedAt: new Date().toISOString(), status: "ACTIVE" as const };
    drafts.set(created.id, created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post(`${apiPath}/applicants/me/applications`, async ({ request }) => {
    await delay(420);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const body = await request.json() as { readonly draftId: number; readonly postingId: number; readonly roleIds: readonly number[]; readonly answers: readonly { readonly key: string; readonly value: ApplicantAnswerValue }[]; readonly consent: { readonly collectionAndUse: boolean; readonly thirdPartyProvision: boolean } };
    const draft = drafts.get(body.draftId);
    if (!draft || draft.postingId !== body.postingId || draft.status !== "ACTIVE") return apiError(400, "DRAFT_ACCESS_DENIED", "제출할 수 있는 Draft가 아닙니다.");
    if (!body.consent.collectionAndUse || !body.consent.thirdPartyProvision) return apiError(400, "APPLICATION_CONSENT_REQUIRED", "필수 개인정보 동의가 필요합니다.");
    if (body.roleIds.length === 0) return apiError(400, "APPLICATION_ROLE_REQUIRED", "배역을 하나 이상 선택해야 합니다.");
    const posting = findPosting(postingId(String(body.postingId)));
    if (!posting) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    const roles = body.roleIds.map((id) => posting.roles.find((role) => Number(role.id) === id));
    if (roles.some((role) => !role)) return apiError(400, "APPLICATION_ROLE_INVALID", "공고에 속하지 않은 배역입니다.");
    if (!posting.allowsMultipleRoles && roles.length > 1) return apiError(400, "APPLICATION_MULTIPLE_ROLES_NOT_ALLOWED", "이 공고는 배역을 하나만 선택할 수 있습니다.");
    if (submittedApplications.some((application) => application.postingId === body.postingId)) return apiError(409, "APPLICATION_ALREADY_SUBMITTED", "이미 지원한 공고입니다.");
    const submittedAt = new Date().toISOString();
    drafts.set(draft.id, { ...draft, status: "SUBMITTED", serverModifiedAt: submittedAt });
    const applicationId = Date.now();
    submittedApplications.unshift({
      id: applicationId,
      postingId: body.postingId,
      submittedAt,
      snapshotSchemaVersion: "1",
      snapshotJson: JSON.stringify({
        schemaVersion: "1",
        submittedAt,
        posting: { id: body.postingId, title: posting.title, allowsMultipleRoles: posting.allowsMultipleRoles },
        roles: roles.map((role) => ({ id: Number(role!.id), name: role!.name, description: role!.description })),
        answers: body.answers.map((answer) => ({ key: answer.key, label: posting.applicationFields?.find((field) => field.id === answer.key)?.label ?? answer.key, value: answer.value })),
        consent: { documentVersion: "application-consent-v1", ...body.consent },
      }),
    });
    return HttpResponse.json({ applicationId, postingId: body.postingId, submittedAt });
  }),
  http.get(`${apiPath}/applicants/me/applications/:applicationId`, async ({ params }) => {
    await delay(260);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const application = submittedApplications.find((item) => item.id === Number(params.applicationId));
    return application ? HttpResponse.json(application) : apiError(404, "NOT_FOUND", "지원서를 찾을 수 없습니다.");
  }),
  http.get(`${apiPath}/public/recommended-postings`, async ({ request }) => {
    await delay(180);
    const search = new URL(request.url).searchParams;
    const limit = Math.min(10, Math.max(1, Number(search.get("limit")) || 3));
    return HttpResponse.json({
      postings: recommendedPostings(search.get("excludePostingId") ?? undefined, limit).map((posting, index) => {
        const period = recruitmentPeriod(posting.recruitmentStart, posting.recruitmentEnd);
        return {
          ...posting,
          id: Number(String(posting.id).replace(/\D/g, "")) || index + 1,
          recruitmentStartsAt: period.start,
          recruitmentEndsAt: period.end,
        };
      }),
    });
  }),
  http.get(`${apiPath}/public/postings/:postingId`, async ({ params }) => {
    await delay(180);
    const posting = publicPostingById(String(params.postingId));
    return posting ? HttpResponse.json(publicPostingToApi(posting)) : apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
  }),
];

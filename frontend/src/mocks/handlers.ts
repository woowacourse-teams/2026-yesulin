import { delay, http, HttpResponse } from "msw";
import type {
  CreatePerformanceRequest,
  CreatePostingRequest,
} from "@/features/auditions/creation-types";
import { performanceId, postingId } from "@/features/auditions/types";
import type { PerformanceId } from "@/features/auditions/types";
import { findPerformance, findPosting } from "./auditions/aggregate";
import { toAuditionTree, toRawPerformance, toRawPosting } from "./auditions/serialize";
import { CATALOG } from "./auditions/catalog";
import { addPerformance, addPosting } from "./auditions/create";
import type { UpdatePerformanceRequest, UpdateProducerProfileRequest } from "@/features/auditions/management-types";
import {
  postingManagementDetail,
  removeCatalogPerformance,
  removeCatalogPosting,
  updateCatalogPerformance,
  updateCatalogPosting,
} from "./auditions/manage";
import { patchProducerProfile, producerProfile } from "./auditions/producer-profile";
import { applicantHandlers } from "./applicants/handlers";
import { screeningHandlers } from "./auditions/screening-handlers";
import { validatePostingDraft } from "./auditions/posting-validation";
import { authHandlers, mockAuthenticationError, mockRequestAuthorized } from "./auth-handlers";

const apiPath = "/api/v1";

const notFound = (message: string) => HttpResponse.json({ code: "RESOURCE_NOT_FOUND", message, detail: null }, { status: 404 });
const badRequest = (message: string) => HttpResponse.json({ code: "INVALID_REQUEST", message, detail: null }, { status: 400 });
const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

type RawPostingMutation = {
  readonly title: string;
  readonly allowsMultipleRoles: boolean;
  readonly recruitmentStartsAt: string;
  readonly recruitmentEndsAt: string;
  readonly applicationGuide?: string;
  readonly roles: readonly { readonly templateId: number; readonly quota: number }[];
  readonly rounds: readonly { readonly round: number; readonly name: string; readonly date: string | null; readonly note: string | null }[];
  readonly applicationFields: readonly { readonly key: string; readonly label: string; readonly required: boolean; readonly custom: boolean; readonly section: string; readonly inputType: string; readonly order: number; readonly config: object }[];
};

function endDate(value: string) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function toPostingRequest(performance: PerformanceId, body: RawPostingMutation): CreatePostingRequest {
  return {
    performanceId: performance,
    title: body.title,
    allowsMultipleRoles: body.allowsMultipleRoles,
    recruitmentStart: body.recruitmentStartsAt.slice(0, 10),
    recruitmentEnd: endDate(body.recruitmentEndsAt),
    applicationGuide: body.applicationGuide ?? "",
    roles: body.roles.map((role) => ({ templateId: String(role.templateId), quota: role.quota })),
    rounds: body.rounds.map((round) => ({ round: round.round as 1 | 2 | 3, name: round.name, date: round.date ?? "", note: round.note ?? "" })),
    applicationFields: body.applicationFields.map((field) => ({ id: field.key, label: field.label, enabled: true, required: field.required, custom: field.custom, section: field.section as never, inputType: field.inputType as never, order: field.order, layout: "FULL", config: field.config })),
  };
}

export const handlers = [
  ...authHandlers,
  http.get(`${apiPath}/producers/me`, async () => {
    await delay(180);
    return mockAuthenticationError() ?? HttpResponse.json(producerProfile());
  }),

  http.patch(`${apiPath}/producers/me`, async ({ request }) => {
    await delay(220);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const body = (await request.json()) as UpdateProducerProfileRequest;
    if (body.companyName !== undefined && !hasText(body.companyName)) return apiError(400, "COMPANY_REQUIRED", "공연사명을 입력해 주세요.");
    if (body.contactName !== undefined && !hasText(body.contactName)) return apiError(400, "CONTACT_REQUIRED", "담당자명을 입력해 주세요.");
    if ((body.description?.length ?? 0) > 200) return apiError(400, "DESCRIPTION_TOO_LONG", "소개는 200자 이내로 적어 주세요.");
    return HttpResponse.json(patchProducerProfile(body));
  }),

  ...applicantHandlers,

  http.get(`${apiPath}/navigation/tree`, async () => {
    await delay(180);
    return mockAuthenticationError() ?? HttpResponse.json(toAuditionTree());
  }),

  http.get(`${apiPath}/performances`, async () => {
    await delay(260);
    return mockAuthenticationError() ?? HttpResponse.json(CATALOG.map(toRawPerformance));
  }),

  http.get(`${apiPath}/performances/:performanceId`, async ({ params }) => {
    await delay(180);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const performance = findPerformance(performanceId(String(params.performanceId)));
    return performance ? HttpResponse.json(toRawPerformance(performance)) : notFound("공연을 찾을 수 없습니다.");
  }),

  http.get(`${apiPath}/performances/:performanceId/postings`, async ({ params }) => {
    await delay(260);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const performance = findPerformance(performanceId(String(params.performanceId)));
    if (!performance) return notFound("공연을 찾을 수 없습니다.");

    return HttpResponse.json(performance.postings.map(toRawPosting));
  }),

  http.post(`${apiPath}/performances`, async ({ request }) => {
    await delay(240);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const body = (await request.json()) as CreatePerformanceRequest;
    if (!hasText(body.posterUrl)) return badRequest("공연 포스터를 선택해 주세요.");
    if (!hasText(body.title)) return badRequest("공연 제목을 입력해 주세요.");
    if (!hasText(body.venue)) return badRequest("공연 장소를 입력해 주세요.");
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return badRequest("배역을 하나 이상 추가해 주세요.");
    }
    if (body.roles.some((role) => !hasText(role.name))) {
      return badRequest("모든 배역의 이름을 입력해 주세요.");
    }
    if (body.roles.some((role) => role.ageMin < 0 || role.ageMax < role.ageMin)) {
      return badRequest("배역의 나이 조건을 확인해 주세요.");
    }

    const created = addPerformance(body);
    return HttpResponse.json(toRawPerformance(created), { status: 201 });
  }),

  http.patch(`${apiPath}/performances/:performanceId`, async ({ params, request }) => {
    await delay(240);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const id = performanceId(String(params.performanceId));
    const raw = (await request.json()) as { readonly title?: string; readonly venue?: string; readonly posterUrl?: string; readonly roles?: CreatePerformanceRequest["roles"] };
    const body: UpdatePerformanceRequest = { title: raw.title, venue: raw.venue, posterFileId: raw.posterUrl, roleTemplates: raw.roles };
    if (body.title !== undefined && !hasText(body.title)) return apiError(400, "TITLE_REQUIRED", "공연 제목을 입력해 주세요.");
    if (body.venue !== undefined && !hasText(body.venue)) return apiError(400, "VENUE_REQUIRED", "공연 장소를 입력해 주세요.");
    if (body.roleTemplates?.length === 0) return apiError(400, "ROLE_REQUIRED", "배역을 하나 이상 남겨 주세요.");
    if (body.roleTemplates?.some((role) => role.ageMin < 0 || role.ageMax < role.ageMin)) return apiError(400, "INVALID_AGE_RANGE", "배역의 나이 조건을 확인해 주세요.");
    if (!updateCatalogPerformance(id, body)) return notFound("공연을 찾을 수 없습니다.");
    return HttpResponse.json(toRawPerformance(findPerformance(id)!));
  }),

  http.delete(`${apiPath}/performances/:performanceId`, async ({ params, request }) => {
    await delay(220);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const id = performanceId(String(params.performanceId));
    const performance = findPerformance(id);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    if (performance.postings.length) return apiError(409, "PERFORMANCE_HAS_POSTINGS", "공고를 먼저 삭제해 주세요.");
    removeCatalogPerformance(id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${apiPath}/postings/:postingId/roles`, async ({ params }) => {
    await delay(260);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const posting = findPosting(postingId(String(params.postingId)));
    if (!posting) return notFound("공고를 찾을 수 없습니다.");

    const performance = findPerformance(posting.performanceId);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");

    return HttpResponse.json(toRawPosting(posting).roles);
  }),

  http.post(`${apiPath}/performances/:performanceId/postings`, async ({ params, request }) => {
    await delay(260);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const id = performanceId(String(params.performanceId));
    const raw = (await request.json()) as RawPostingMutation;
    const body = toPostingRequest(id, raw);
    const performance = findPerformance(id);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    const validation = validatePostingDraft(body, performance.roleTemplates);
    if (validation) return apiError(400, validation.code, validation.message);

    const createdPosting = addPosting(performance, body);
    return HttpResponse.json(toRawPosting(createdPosting), { status: 201 });
  }),

  http.get(`${apiPath}/postings/:postingId`, async ({ params }) => {
    await delay(220);
    const authenticationError = mockAuthenticationError();
    if (authenticationError) return authenticationError;
    const posting = findPosting(postingId(String(params.postingId)));
    return posting ? HttpResponse.json(toRawPosting(posting)) : notFound("공고를 찾을 수 없습니다.");
  }),

  http.patch(`${apiPath}/postings/:postingId`, async ({ params, request }) => {
    await delay(240);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const id = postingId(String(params.postingId));
    const current = postingManagementDetail(id);
    if (!current) return notFound("공고를 찾을 수 없습니다.");
    if (current.phase !== "UPCOMING" || current.applicantCount > 0) return apiError(409, "POSTING_UPDATE_NOT_ALLOWED", "모집 시작 전이고 지원자가 없는 공고만 수정할 수 있습니다.");
    const raw = (await request.json()) as RawPostingMutation;
    const body = toPostingRequest(current.performanceId, raw);
    if (body.title !== undefined && !hasText(body.title)) return apiError(400, "TITLE_REQUIRED", "공고 제목을 입력해 주세요.");
    if (body.recruitmentStart && body.recruitmentEnd && body.recruitmentStart > body.recruitmentEnd) return apiError(400, "INVALID_PERIOD", "모집 종료일은 시작일보다 빠를 수 없습니다.");
    const validation = validatePostingDraft({
      title: body.title ?? current.title,
      allowsMultipleRoles: body.allowsMultipleRoles ?? current.allowsMultipleRoles,
      recruitmentStart: body.recruitmentStart ?? current.recruitmentStart,
      recruitmentEnd: body.recruitmentEnd ?? current.recruitmentEnd,
      roles: body.roles ?? current.roles,
      rounds: body.rounds ?? current.rounds,
      applicationFields: body.applicationFields ?? current.applicationFields,
    }, current.roleTemplates);
    if (validation) return apiError(400, validation.code, validation.message);
    const posting = updateCatalogPosting(id, body);
    if (!posting) return notFound("공고를 찾을 수 없습니다.");
    const performance = findPerformance(posting.performanceId);
    return performance ? HttpResponse.json(toRawPosting(posting)) : notFound("공연을 찾을 수 없습니다.");
  }),

  http.delete(`${apiPath}/postings/:postingId`, async ({ params, request }) => {
    await delay(220);
    const authorizationError = mockRequestAuthorized(request);
    if (authorizationError) return authorizationError;
    const id = postingId(String(params.postingId));
    const current = postingManagementDetail(id);
    if (!current) return notFound("공고를 찾을 수 없습니다.");
    if (current.applicantCount > 0) return apiError(409, "POSTING_HAS_APPLICANTS", "지원자가 있는 공고는 삭제할 수 없습니다.");
    removeCatalogPosting(id);
    return new HttpResponse(null, { status: 204 });
  }),

  ...screeningHandlers,
];

import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type {
  CreatePerformanceRequest,
  CreatePostingRequest,
} from "@/features/auditions/creation-types";
import { POSTING_PHASES, performanceId, postingId, type PostingPhase } from "@/features/auditions/types";
import { findPerformance, findPosting } from "./auditions/aggregate";
import {
  toPerformanceRef,
  toPerformanceSummary,
  toPostingListResponse,
  toPostingSummary,
  toRoleSummary,
  toAuditionTree,
} from "./auditions/serialize";
import { CATALOG } from "./auditions/catalog";
import { addPerformance, addPosting } from "./auditions/create";
import type { UpdatePerformanceRequest, UpdatePostingRequest, UpdateProducerProfileRequest } from "@/features/auditions/management-types";
import {
  postingManagementDetail,
  removeCatalogPerformance,
  removeCatalogPosting,
  updateCatalogPerformance,
  updateCatalogPerformancePeriod,
  updateCatalogPosting,
} from "./auditions/manage";
import { patchProducerProfile, producerProfile } from "./auditions/producer-profile";
import { applicantHandlers } from "./applicants/handlers";
import { screeningHandlers } from "./auditions/screening-handlers";
import { validatePostingDraft } from "./auditions/posting-validation";
import { authHandlers } from "./auth-handlers";
import { adminLogHandlers } from "./admin-log-handlers";

const apiPath = "/api";
const realProducerApiEnabled = frontendEnvironment.producerApiEnabled;

const notFound = (message: string) => HttpResponse.json({ message }, { status: 404 });
const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 });
const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const handlers = [
  ...authHandlers,
  ...adminLogHandlers,
  http.post(`${apiPath}/v1/upload-diagnostics`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${apiPath}/v1/producers/me`, async () => {
    if (realProducerApiEnabled) return passthrough();
    await delay(180);
    return HttpResponse.json(producerProfile());
  }),

  http.patch(`${apiPath}/v1/producers/me`, async ({ request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(220);
    const body = (await request.json()) as UpdateProducerProfileRequest;
    if (body.companyName === undefined && body.contactName === undefined && body.contactRole === undefined && body.description === undefined) return apiError(400, "PRODUCER_INVALID_UPDATE", "변경할 기획사·제작사 정보가 없습니다.");
    if (body.companyName !== undefined && !hasText(body.companyName)) return apiError(400, "PRODUCER_INVALID_COMPANY_NAME", "기획사·제작사명이 필요합니다.");
    if (body.contactName !== undefined && !hasText(body.contactName)) return apiError(400, "PRODUCER_INVALID_CONTACT_NAME", "담당자명을 입력해 주세요.");
    if ((body.description?.length ?? 0) > 200) return apiError(400, "PRODUCER_INVALID_DESCRIPTION", "소개는 200자 이내로 적어 주세요.");
    return HttpResponse.json(patchProducerProfile(body));
  }),

  ...applicantHandlers,

  http.get(`${apiPath}/v1/producers/me/navigation-tree`, async () => {
    if (realProducerApiEnabled) return passthrough();
    await delay(180);
    try { return HttpResponse.json(toAuditionTree()); }
    catch (cause) { return apiError(500, "MOCK_DATA_ERROR", cause instanceof Error ? cause.message : "목 탐색 데이터를 만들지 못했습니다."); }
  }),

  http.get(`${apiPath}/v1/performances`, async () => {
    if (realProducerApiEnabled) return passthrough();
    await delay(260);
    try { return HttpResponse.json({ performances: CATALOG.map(toPerformanceSummary) }); }
    catch (cause) { return apiError(500, "MOCK_DATA_ERROR", cause instanceof Error ? cause.message : "목 공연 데이터를 만들지 못했습니다."); }
  }),

  http.get(`${apiPath}/performances/:performanceId`, async ({ params }) => {
    await delay(180);
    const performance = findPerformance(performanceId(String(params.performanceId)));
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    return HttpResponse.json({
      id: performance.id,
      posterFileId: null,
      posterUrl: performance.posterUrl,
      title: performance.title,
      venue: performance.venue,
      venueAddress: performance.venueAddress,
      roleTemplates: performance.roleTemplates,
    });
  }),

  http.get(`${apiPath}/performances/:performanceId/postings`, async ({ params, request }) => {
    await delay(260);
    const performance = findPerformance(performanceId(String(params.performanceId)));
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    const url = new URL(request.url);
    const phase = url.searchParams.get("phase");
    return HttpResponse.json(toPostingListResponse(performance, {
      keyword: url.searchParams.get("keyword") ?? undefined,
      phase: POSTING_PHASES.includes(phase as PostingPhase) ? phase as PostingPhase : undefined,
    }));
  }),

  http.post(`${apiPath}/performances`, async ({ request }) => {
    await delay(240);
    const body = (await request.json()) as CreatePerformanceRequest;
    if (!hasText(body.posterUrl)) return badRequest("공연 포스터를 선택해 주세요.");
    if (!hasText(body.title)) return badRequest("공연 제목을 입력해 주세요.");
    if ((hasText(body.venue) && !hasText(body.venueAddress?.roadAddress))
      || (!hasText(body.venue) && hasText(body.venueAddress?.roadAddress))) {
      return badRequest("공연 장소명과 주소는 함께 입력해 주세요.");
    }
    if (!hasText(body.performanceStart)) return badRequest("공연 시작일을 입력해 주세요.");
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return badRequest("배역을 하나 이상 추가해 주세요.");
    }
    if (body.roles.some((role) => !hasText(role.name))) {
      return badRequest("모든 배역의 이름을 입력해 주세요.");
    }

    addPerformance(body);
    return HttpResponse.json({ performances: CATALOG.map(toPerformanceSummary) }, { status: 201 });
  }),

  http.patch(`${apiPath}/performances/:performanceId/period`, async ({ params, request }) => {
    await delay(180);
    const id = performanceId(String(params.performanceId));
    const body = (await request.json()) as Pick<UpdatePerformanceRequest, "performanceStart" | "performanceEnd">;
    if (!hasText(body.performanceStart)) return badRequest("공연 시작일을 입력해 주세요.");
    if (body.performanceEnd && body.performanceEnd < body.performanceStart) {
      return badRequest("공연 종료일은 시작일보다 빠를 수 없습니다.");
    }
    const updated = updateCatalogPerformancePeriod(id, body.performanceStart, body.performanceEnd ?? "");
    if (!updated) return notFound("공연을 찾을 수 없습니다.");
    return HttpResponse.json({ performances: CATALOG.map(toPerformanceSummary) });
  }),

  http.patch(`${apiPath}/performances/:performanceId`, async ({ params, request }) => {
    await delay(240);
    const id = performanceId(String(params.performanceId));
    const performance = findPerformance(id);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    if (performance.postings.length) return apiError(409, "PERFORMANCE_HAS_AUDITIONS", "등록된 공고가 있어 공연을 수정하거나 삭제할 수 없습니다.");
    const body = (await request.json()) as UpdatePerformanceRequest;
    if (!hasText(body.title) || body.title.length > 200) return apiError(400, "TITLE_REQUIRED", "공연 제목은 200자 이내로 입력해 주세요.");
    if ((hasText(body.venue) && !hasText(body.venueAddress?.roadAddress))
      || (!hasText(body.venue) && hasText(body.venueAddress?.roadAddress))) {
      return apiError(400, "VENUE_REQUIRED", "공연 장소명과 주소는 함께 입력해 주세요.");
    }
    if (body.venueAddress && (body.venueAddress.roadAddress.length > 300 || (body.venueAddress.detailAddress?.length ?? 0) > 300)) return apiError(400, "ADDRESS_TOO_LONG", "공연 주소는 300자 이내로 입력해 주세요.");
    if (!Array.isArray(body.roles) || body.roles.some((role) => !hasText(role.name) || !hasText(role.description))) return apiError(400, "INVALID_ROLES", "모든 배역의 이름과 설명을 입력해 주세요.");
    updateCatalogPerformance(id, body);
    return HttpResponse.json({ performances: CATALOG.map(toPerformanceSummary) });
  }),

  http.delete(`${apiPath}/performances/:performanceId`, async ({ params }) => {
    await delay(220);
    const id = performanceId(String(params.performanceId));
    const performance = findPerformance(id);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    if (performance.postings.length) return apiError(409, "PERFORMANCE_HAS_AUDITIONS", "등록된 공고가 있어 공연을 수정하거나 삭제할 수 없습니다.");
    removeCatalogPerformance(id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${apiPath}/postings/:postingId/roles`, async ({ params }) => {
    await delay(260);
    const posting = findPosting(postingId(String(params.postingId)));
    if (!posting) return notFound("공고를 찾을 수 없습니다.");

    const performance = findPerformance(posting.performanceId);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");

    return HttpResponse.json({
      performance: toPerformanceRef(performance),
      posting: toPostingSummary(posting),
      roles: posting.roles.map((role) => toRoleSummary(role, posting)),
    });
  }),

  http.post(`${apiPath}/performances/:performanceId/postings`, async ({ request }) => {
    await delay(260);
    const body = (await request.json()) as CreatePostingRequest;
    const performance = findPerformance(body.performanceId);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    const validation = validatePostingDraft(body, performance.roleTemplates);
    if (validation) return apiError(400, validation.code, validation.message);

    const createdPosting = addPosting(performance, body);
    return HttpResponse.json({
      ...toPostingListResponse(performance),
      createdPostingId: createdPosting.id,
    }, { status: 201 });
  }),

  http.get(`${apiPath}/postings/:postingId`, async ({ params }) => {
    await delay(220);
    const detail = postingManagementDetail(postingId(String(params.postingId)));
    return detail ? HttpResponse.json(detail) : notFound("공고를 찾을 수 없습니다.");
  }),

  http.patch(`${apiPath}/postings/:postingId`, async ({ params, request }) => {
    await delay(240);
    const id = postingId(String(params.postingId));
    const current = postingManagementDetail(id);
    if (!current) return notFound("공고를 찾을 수 없습니다.");
    const body = (await request.json()) as UpdatePostingRequest;
    if (body.recruitmentStart && body.recruitmentEnd && body.recruitmentStart > body.recruitmentEnd) return apiError(400, "INVALID_PERIOD", "모집 종료일은 시작일보다 빠를 수 없습니다.");
    if (body.performanceStart && body.performanceEnd && body.performanceEnd < body.performanceStart) return apiError(400, "INVALID_PERFORMANCE_PERIOD", "공연 종료일은 시작일보다 빠를 수 없습니다.");
    const started = current.phase !== "UPCOMING" || current.applicantCount > 0;
    if (started && body.recruitmentStart && body.recruitmentStart !== current.recruitmentStart) return apiError(409, "RECRUITMENT_START_LOCKED", "모집 시작 후에는 시작 일시를 바꿀 수 없습니다.");
    if (started && body.recruitmentEnd && body.recruitmentEnd < current.recruitmentEnd) return apiError(409, "DEADLINE_CANNOT_SHRINK", "모집 기간은 연장만 할 수 있습니다.");
    const nextRounds = body.rounds;
    if (nextRounds && current.lockedRounds.some((round) => JSON.stringify(nextRounds.find((item) => item.round === round)) !== JSON.stringify(current.rounds.find((item) => item.round === round)))) return apiError(409, "ROUND_LOCKED", "완료된 전형 일정은 수정할 수 없습니다.");
    const validation = validatePostingDraft({
      title: body.title ?? current.title,
      posterUrl: current.posterUrl,
      performanceStart: body.performanceStart ?? current.performanceStart,
      performanceEnd: body.performanceEnd ?? current.performanceEnd,
      isOpenCall: current.isOpenCall,
      recruitmentStart: body.recruitmentStart ?? current.recruitmentStart,
      recruitmentEnd: body.recruitmentEnd ?? current.recruitmentEnd,
      roles: current.roles,
      rounds: body.rounds ?? current.rounds,
      applicationFields: current.applicationFields,
      applicationGuide: current.applicationGuide,
    }, current.roleTemplates);
    if (validation) return apiError(400, validation.code, validation.message);
    const posting = updateCatalogPosting(id, body);
    if (!posting) return notFound("공고를 찾을 수 없습니다.");
    const performance = findPerformance(posting.performanceId);
    return performance ? HttpResponse.json(toPostingListResponse(performance)) : notFound("공연을 찾을 수 없습니다.");
  }),

  http.delete(`${apiPath}/postings/:postingId`, async ({ params }) => {
    await delay(220);
    const id = postingId(String(params.postingId));
    const current = postingManagementDetail(id);
    if (!current) return notFound("공고를 찾을 수 없습니다.");
    if (current.applicantCount > 0) return apiError(409, "POSTING_HAS_APPLICANTS", "배우가 있는 공고는 삭제할 수 없습니다.");
    removeCatalogPosting(id);
    return new HttpResponse(null, { status: 204 });
  }),

  ...screeningHandlers,
];

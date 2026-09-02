import { AuditionRequestError, producerRequest as request } from "./api-client";
import type {
  AuditionFormResource,
  AuditionManagementListResource,
  AuditionManagementResource,
  AuditionResource,
  AuditionRolesManagementResource,
  AuditionRolesResource,
  AuditionScheduleResource,
  PerformanceResource,
  ScreeningBoardResource,
} from "./backend-resources";
import { saveV1ApplicationForm, toApplicationFields } from "./audition-v1-form";
import { toKoreaInstant, toKoreaLocalDateTime } from "./audition-date-policy";
import type { CreatePostingRequest } from "./creation-types";
import type { PostingManagementDetail, UpdatePostingRequest } from "./management-types";
import {
  performanceId,
  postingId,
  roleId,
  type CreatePostingResponse,
  type PostingId,
  type PostingListResponse,
  type PostingPhase,
  type PostingSearchCondition,
  type PostingSummary,
  type RoleListResponse,
  type RoundNumber,
} from "./types";

const PERFORMANCE_ID_PATTERN = /^[1-9]\d*$/;
const AUDITION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isBackendPerformanceId = (value: string) => PERFORMANCE_ID_PATTERN.test(value);
export const isBackendAuditionId = (value: string) => AUDITION_ID_PATTERN.test(value);

export async function getV1Postings(
  rawPerformanceId: string,
  condition: PostingSearchCondition = {},
): Promise<PostingListResponse> {
  const searchParams = new URLSearchParams({ performanceId: rawPerformanceId });
  if (condition.keyword?.trim()) searchParams.set("keyword", condition.keyword.trim());
  if (condition.phase) searchParams.set("phase", condition.phase);
  const [performance, response] = await Promise.all([
    request<PerformanceResource>(`/v1/performances/${rawPerformanceId}`),
    request<AuditionManagementListResource>(`/v1/auditions?${searchParams.toString()}`),
  ]);
  const postings = response.auditions.map(toManagementPostingSummary);
  return {
    performance: toPerformanceRef(performance),
    roleTemplates: toRoleTemplates(performance),
    postings,
    counts: response.counts,
  };
}

export async function createV1Posting(body: CreatePostingRequest, auditionId: string): Promise<CreatePostingResponse> {
  const audition = await request<AuditionResource>("/v1/auditions", {
    method: "POST",
    body: JSON.stringify({
      id: auditionId,
      performanceId: body.performanceId,
      title: body.title,
      rehearsalVenue: body.rehearsalVenue || null,
      rehearsalVenueAddress: body.rehearsalVenueAddress.roadAddress ? body.rehearsalVenueAddress : null,
    }),
  });
  if (audition.status !== "PUBLISHED") {
    await Promise.all([
      saveRoles(audition.id, body),
      saveSchedule(audition.id, body),
      saveV1ApplicationForm(audition.id, body),
    ]);
    await request<AuditionResource>(`/v1/auditions/${audition.id}/publication`, { method: "PUT" });
  }
  const response = await getV1Postings(String(body.performanceId));
  return { ...response, createdPostingId: postingId(String(audition.id)) };
}

/**
 * 공연 기간은 공연이, 모집·전형 일정은 공고가 담당한다.
 */
export async function updateV1Posting(id: PostingId, body: UpdatePostingRequest): Promise<void> {
  const saveBasicInformation = () => request<AuditionResource>(`/v1/auditions/${id}/basic-information`, {
    method: "PUT",
    body: JSON.stringify({
      title: body.title,
      rehearsalVenue: body.rehearsalVenue,
      rehearsalVenueAddress: body.rehearsalVenueAddress?.roadAddress ? body.rehearsalVenueAddress : null,
    }),
  });
  const rounds = body.rounds;
  if (!rounds) {
    await saveBasicInformation();
    return;
  }
  const saveSchedule = () => request<AuditionScheduleResource>(`/v1/auditions/${id}/schedule`, {
    method: "PUT",
    body: JSON.stringify({
      recruitmentEndAt: toKoreaInstant(body.recruitmentEnd ?? ""),
      stages: rounds.map((round) => ({
        stageId: round.stageId ?? null,
        name: round.name,
        date: round.date,
        notice: round.note,
        venue: round.venue || null,
        venueAddress: round.venueAddress.roadAddress ? round.venueAddress : null,
      })),
    }),
  });
  await saveBasicInformation();
  await saveSchedule();
}

export function deleteV1Posting(id: PostingId) {
  return request<void>(`/v1/auditions/${id}`, { method: "DELETE" });
}

export async function getV1PostingManagement(id: PostingId): Promise<PostingManagementDetail> {
  const detail = await loadDetail(id);
  const { audition, performance, roles, schedule, form } = detail;
  const boards = await loadScreeningBoards(roles, schedule);
  const applicationFields = toApplicationFields(form);
  return {
    id,
    performanceId: performanceId(String(performance.id)),
    performanceTitle: performance.title,
    posterUrl: performance.posterUrl,
    detailImageUrl: "",
    title: audition.title,
    isOpenCall: false,
    allowsMultipleRoles: roles?.multipleRoleApplicationsAllowed ?? false,
    recruitmentStart: toKoreaLocalDateTime(schedule?.recruitmentStartAt ?? undefined),
    recruitmentEnd: toKoreaLocalDateTime(schedule?.recruitmentEndAt),
    performanceStart: performance.performanceStartDate ?? audition.performanceStartDate,
    performanceEnd: performance.performanceEndDate ?? audition.performanceEndDate ?? "",
    phase: phaseOf(audition, schedule),
    applicantCount: screeningStats(boards).applicantCount,
    roleTemplates: toRoleTemplates(performance),
    roles: (roles?.roles ?? []).map((role) => ({
      templateId: String(role.performanceRoleId),
      quota: role.recruitmentCount,
      gender: role.gender,
      ageMin: role.minimumAge,
      ageMax: role.maximumAge,
    })),
    rounds: (schedule?.stages ?? []).map((stage) => ({
      round: stage.order as RoundNumber,
      name: stage.name,
      date: stage.date,
      note: stage.notice,
      stageId: stage.id,
      venue: stage.venue.name,
      venueAddress: stage.venue,
    })),
    lockedRounds: audition.status === "CLOSED" ? (schedule?.stages ?? []).map((stage) => stage.order) : [],
    applicationFields,
    applicationGuide: "",
    rehearsalVenue: audition.rehearsalVenue.name,
    rehearsalVenueAddress: audition.rehearsalVenue,
  };
}

export async function getV1Roles(id: PostingId): Promise<RoleListResponse> {
  const audition = await request<AuditionResource>(`/v1/auditions/${id}`);
  const [performance, roles] = await Promise.all([
    request<PerformanceResource>(`/v1/performances/${audition.performanceId}`),
    request<AuditionRolesManagementResource>(`/v1/auditions/${id}/roles`),
  ]);
  return {
    performance: toPerformanceRef(performance),
    posting: toManagementPostingSummary(roles.posting),
    roles: roles.roles.map((role) => ({
      id: roleId(String(role.id)),
      postingId: id,
      name: role.name,
      description: role.description,
      quota: role.recruitmentCount,
      gender: role.gender,
      ageMin: role.minimumAge,
      ageMax: role.maximumAge,
      applicantCount: role.applicantCount,
      activeRound: role.activeRound as RoundNumber,
      allRoundsClosed: role.allRoundsClosed,
      progress: role.progress,
      counts: role.counts,
    })),
  };
}

export function toManagementPostingSummary(audition: AuditionManagementResource): PostingSummary {
  return {
    id: postingId(String(audition.id)),
    performanceId: performanceId(String(audition.performanceId)),
    title: audition.title,
    deadline: audition.recruitmentEndAt?.slice(0, 10).replaceAll("-", ".") ?? "미정",
    phase: audition.phase,
    isOpenCall: false,
    roleCount: audition.roleCount,
    quotaTotal: audition.quotaTotal,
    applicantCount: audition.applicantCount,
    pendingReviewCount: audition.pendingReviewCount,
    allRoundsClosed: audition.allRoundsClosed,
    progress: audition.progress,
    previewPhotoUrls: [],
  };
}

async function loadDetail(id: PostingId) {
  const audition = await request<AuditionResource>(`/v1/auditions/${id}`);
  const [performance, roles, schedule, form] = await Promise.all([
    request<PerformanceResource>(`/v1/performances/${audition.performanceId}`),
    optionalRequest<AuditionRolesResource>(`/v1/auditions/${id}/roles`),
    optionalRequest<AuditionScheduleResource>(`/v1/auditions/${id}/schedule`),
    optionalRequest<AuditionFormResource>(`/v1/auditions/${id}/application-form`),
  ]);
  return { audition, performance, roles, schedule, form };
}

async function optionalRequest<T>(path: string) {
  try {
    return await request<T>(path);
  } catch (cause) {
    if (cause instanceof AuditionRequestError && cause.status === 404) return null;
    throw cause;
  }
}

function saveRoles(auditionId: string, body: CreatePostingRequest) {
  return request(`/v1/auditions/${auditionId}/roles`, {
    method: "PUT",
    body: JSON.stringify({
      multipleRoleApplicationsAllowed: body.allowsMultipleRoles,
      roles: body.roles.map((role) => ({
        performanceRoleId: Number(role.templateId),
        recruitmentCount: role.quota,
        gender: role.gender,
        minimumAge: role.ageMin,
        maximumAge: role.ageMax,
      })),
    }),
  });
}

function saveSchedule(auditionId: string, body: CreatePostingRequest) {
  return request(`/v1/auditions/${auditionId}/schedule`, {
    method: "PUT",
    body: JSON.stringify({
      recruitmentEndAt: toKoreaInstant(body.recruitmentEnd),
      stages: body.rounds.map((round) => ({
        stageId: null,
        name: round.name,
        date: round.date,
        notice: round.note,
        venue: round.venue || null,
        venueAddress: round.venueAddress.roadAddress ? round.venueAddress : null,
      })),
    }),
  });
}

async function loadScreeningBoards(
  roles: AuditionRolesResource | null,
  schedule: AuditionScheduleResource | null,
) {
  if (!roles || !schedule || schedule.stages.length === 0) return [];
  return Promise.all(roles.roles.map((role) => optionalRequest<ScreeningBoardResource>(
    `/v1/audition-roles/${role.id}/screening-rounds/1/submissions`,
  )));
}

function screeningStats(boards: readonly (ScreeningBoardResource | null)[]) {
  const submissionIds = new Set(boards.flatMap((board) => board?.submissions.map((submission) => submission.id) ?? []));
  const done = boards.reduce((sum, board) => sum + (board?.role.progress.done ?? 0), 0);
  const total = boards.reduce((sum, board) => sum + (board?.role.progress.total ?? 0), 0);
  const previewPhotoUrls = [...new Set(boards.flatMap((board) => board?.submissions.flatMap((submission) =>
    submission.photos.map((photo) => photo.url)) ?? []))].slice(0, 3);
  return {
    applicantCount: submissionIds.size,
    pendingReviewCount: boards.reduce((sum, board) => sum + (board?.role.counts.pending ?? 0), 0),
    progress: { done, total, percent: total === 0 ? 0 : Math.round(done * 100 / total) },
    previewPhotoUrls,
  };
}

function phaseOf(audition: AuditionResource, schedule: AuditionScheduleResource | null): PostingPhase {
  if (audition.status === "DRAFT") return "DRAFT";
  if (audition.status === "CLOSED") return "FINISHED";
  if (!schedule || !schedule.recruitmentStartAt || Date.now() < Date.parse(schedule.recruitmentStartAt)) return "UPCOMING";
  return Date.now() < Date.parse(schedule.recruitmentEndAt) ? "OPEN" : "RECRUIT_CLOSED";
}

function toPerformanceRef(performance: PerformanceResource) {
  return {
    id: performanceId(String(performance.id)),
    posterUrl: performance.posterUrl,
    title: performance.title,
    performanceStart: performance.performanceStartDate ?? "",
    performanceEnd: performance.performanceEndDate ?? "",
  };
}

function toRoleTemplates(performance: PerformanceResource) {
  return performance.roles.map((role) => ({ id: String(role.id), name: role.name, description: role.description }));
}

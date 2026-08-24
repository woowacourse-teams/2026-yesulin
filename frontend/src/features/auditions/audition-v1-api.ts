import { AuditionRequestError, request } from "./api-client";
import type {
  AuditionFormResource,
  AuditionResource,
  AuditionRolesResource,
  AuditionScheduleResource,
  PerformanceResource,
  ScreeningBoardResource,
} from "./backend-resources";
import { saveV1ApplicationForm, toApplicationFields } from "./audition-v1-form";
import type { CreatePostingRequest } from "./creation-types";
import type { PostingManagementDetail } from "./management-types";
import {
  performanceId,
  postingId,
  roleId,
  type CreatePostingResponse,
  type PostingId,
  type PostingListResponse,
  type PostingPhase,
  type PostingSummary,
  type RoleListResponse,
  type RoundNumber,
} from "./types";

const PERFORMANCE_ID_PATTERN = /^[1-9]\d*$/;
const AUDITION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_PROGRESS = { done: 0, total: 0, percent: 0 } as const;
const EMPTY_COUNTS = { all: 0, pending: 0, done: 0, pass: 0, fail: 0, absent: 0, etc: 0 } as const;

export const isBackendPerformanceId = (value: string) => PERFORMANCE_ID_PATTERN.test(value);
export const isBackendAuditionId = (value: string) => AUDITION_ID_PATTERN.test(value);

export async function getV1Postings(rawPerformanceId: string): Promise<PostingListResponse> {
  const [performance, auditions] = await Promise.all([
    request<PerformanceResource>(`/v1/performances/${rawPerformanceId}`),
    request<readonly AuditionResource[]>(`/v1/auditions?performanceId=${rawPerformanceId}`),
  ]);
  const postings = await Promise.all(auditions.map(async (audition) => {
    const [roles, schedule] = await Promise.all([
      optionalRequest<AuditionRolesResource>(`/v1/auditions/${audition.id}/roles`),
      optionalRequest<AuditionScheduleResource>(`/v1/auditions/${audition.id}/schedule`),
    ]);
    const boards = await loadScreeningBoards(roles, schedule);
    return toPostingSummary(audition, roles, schedule, boards);
  }));
  return { performance: toPerformanceRef(performance), roleTemplates: toRoleTemplates(performance), postings };
}

export async function createV1Posting(body: CreatePostingRequest, auditionId: string): Promise<CreatePostingResponse> {
  const audition = await request<AuditionResource>("/v1/auditions", {
    method: "POST",
    body: JSON.stringify({
      id: auditionId,
      performanceId: body.performanceId,
      title: body.title,
      performanceStartDate: body.performanceStart,
      performanceEndDate: body.performanceEnd || null,
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
    recruitmentStart: toLocalDateTime(schedule?.recruitmentStartAt),
    recruitmentEnd: toLocalDateTime(schedule?.recruitmentEndAt),
    performanceStart: audition.performanceStartDate,
    performanceEnd: audition.performanceEndDate ?? "",
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
    })),
    lockedRounds: audition.status === "CLOSED" ? (schedule?.stages ?? []).map((stage) => stage.order) : [],
    applicationFields,
    applicationGuide: "",
    rehearsalVenue: "",
    rehearsalVenueAddress: { roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null },
  };
}

export async function getV1Roles(id: PostingId): Promise<RoleListResponse> {
  const { audition, performance, roles, schedule } = await loadDetail(id);
  const boards = await loadScreeningBoards(roles, schedule);
  return {
    performance: toPerformanceRef(performance),
    posting: toPostingSummary(audition, roles, schedule, boards),
    roles: (roles?.roles ?? []).map((role, index) => toRoleSummary(id, audition, role, boards[index] ?? null)),
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
      recruitmentStartAt: new Date(body.recruitmentStart).toISOString(),
      recruitmentEndAt: new Date(body.recruitmentEnd).toISOString(),
      stages: body.rounds.map((round) => ({ stageId: null, name: round.name, date: round.date, notice: round.note })),
    }),
  });
}

function toPostingSummary(
  audition: AuditionResource,
  roles: AuditionRolesResource | null,
  schedule: AuditionScheduleResource | null,
  boards: readonly (ScreeningBoardResource | null)[] = [],
): PostingSummary {
  const stats = screeningStats(boards);
  return {
    id: postingId(String(audition.id)),
    performanceId: performanceId(String(audition.performanceId)),
    title: audition.title,
    deadline: schedule ? schedule.recruitmentEndAt.slice(0, 10).replaceAll("-", ".") : "미정",
    phase: phaseOf(audition, schedule),
    isOpenCall: false,
    roleCount: roles?.roles.length ?? 0,
    quotaTotal: roles?.roles.reduce((sum, role) => sum + role.recruitmentCount, 0) ?? 0,
    applicantCount: stats.applicantCount,
    pendingReviewCount: stats.pendingReviewCount,
    allRoundsClosed: audition.status === "CLOSED",
    progress: stats.progress,
    previewPhotoUrls: stats.previewPhotoUrls,
  };
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

function toRoleSummary(
  id: PostingId,
  audition: AuditionResource,
  role: AuditionRolesResource["roles"][number],
  board: ScreeningBoardResource | null,
) {
  return {
    id: roleId(String(role.id)),
    postingId: id,
    name: role.name,
    description: role.description,
    quota: role.recruitmentCount,
    gender: role.gender,
    ageMin: role.minimumAge,
    ageMax: role.maximumAge,
    applicantCount: board?.role.applicantCount ?? 0,
    activeRound: (board?.role.activeRound ?? 1) as RoundNumber,
    allRoundsClosed: audition.status === "CLOSED" || (board?.role.allRoundsClosed ?? false),
    progress: board?.role.progress ?? EMPTY_PROGRESS,
    counts: board?.role.counts ?? EMPTY_COUNTS,
  };
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
  if (!schedule || Date.now() < Date.parse(schedule.recruitmentStartAt)) return "UPCOMING";
  return Date.now() < Date.parse(schedule.recruitmentEndAt) ? "OPEN" : "RECRUIT_CLOSED";
}

function toPerformanceRef(performance: PerformanceResource) {
  return { id: performanceId(String(performance.id)), posterUrl: performance.posterUrl, title: performance.title };
}

function toRoleTemplates(performance: PerformanceResource) {
  return performance.roles.map((role) => ({ id: String(role.id), name: role.name, description: role.description }));
}

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

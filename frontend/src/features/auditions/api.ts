import { apiRequest, ApiError } from "@/lib/api-client";
import type {
  CloseRoundRequest,
  CreatePostingResponse,
  PerformanceId,
  PerformanceListResponse,
  PostingId,
  PostingListResponse,
  RoleId,
  RoleListResponse,
  RoundNumber,
  SaveReviewRequest,
  AuditionBoardResponse,
  AuditionTree,
  PerformanceSummary,
  PostingSummary,
  RoleSummary,
  PostingPhase,
} from "./types";
import { performanceId, postingId, roleId } from "./types";
import type { CreatePerformanceRequest, CreatePostingRequest, PerformanceRoleTemplate } from "./creation-types";
import type {
  PostingManagementDetail,
  ProducerProfile,
  UpdatePerformanceRequest,
  UpdatePostingRequest,
  UpdateProducerProfileRequest,
} from "./management-types";

export class AuditionRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
  }
}

type RawRoleTemplate = { readonly id: number; readonly name: string; readonly description: string | null; readonly genderCondition: "ANY" | "MALE" | "FEMALE"; readonly ageMin: number; readonly ageMax: number };
type RawPerformance = { readonly id: number; readonly title: string; readonly venue: string | null; readonly posterUrl: string | null; readonly createdAt: string; readonly roleTemplates: readonly RawRoleTemplate[] };
type RawRole = { readonly id: number; readonly postingId: number; readonly templateId: number | null; readonly name: string; readonly description: string | null; readonly quota: number | null; readonly genderCondition: "ANY" | "MALE" | "FEMALE" | null; readonly ageMin: number | null; readonly ageMax: number | null };
type RawRound = { readonly id: number; readonly roleId: number; readonly round: number; readonly name: string; readonly date: string | null; readonly note: string | null; readonly status: "LOCKED" | "OPEN" | "CLOSED"; readonly closedAt: string | null };
type RawField = { readonly id: number; readonly key: string; readonly label: string; readonly required: boolean; readonly custom: boolean; readonly section: string; readonly inputType: string; readonly order: number; readonly configJson: string };
type RawPosting = { readonly id: number; readonly performanceId: number; readonly title: string; readonly status: "UPCOMING" | "OPEN" | "CLOSED"; readonly allowsMultipleRoles: boolean; readonly recruitmentStartsAt: string; readonly recruitmentEndsAt: string; readonly applicationGuide: string | null; readonly roles: readonly RawRole[]; readonly rounds: readonly RawRound[]; readonly applicationFields: readonly RawField[] };
type RawProducerProfile = { readonly companyName: string; readonly contactName: string | null; readonly contactRole: string | null; readonly logoUrl: string | null; readonly description: string | null; readonly email: string; readonly businessNumber: string; readonly representativeName: string; readonly verificationStatus: ProducerProfile["verificationStatus"]; readonly verifiedAt: string | null };

function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init).catch((cause: unknown) => {
    if (cause instanceof ApiError) throw new AuditionRequestError(cause.message, cause.status);
    throw cause;
  });
}

const emptyProgress = { done: 0, total: 0, percent: 0 } as const;
const emptyCounts = { all: 0, pending: 0, done: 0, pass: 0, fail: 0, absent: 0, etc: 0 } as const;

function phase(status: RawPosting["status"]): PostingPhase {
  return status === "CLOSED" ? "RECRUIT_CLOSED" : status;
}

function roleTemplate(raw: RawRoleTemplate): PerformanceRoleTemplate {
  return { id: String(raw.id), name: raw.name, description: raw.description ?? "", gender: raw.genderCondition, ageMin: raw.ageMin, ageMax: raw.ageMax };
}

function performanceSummary(raw: RawPerformance, postings: readonly RawPosting[] = []): PerformanceSummary {
  return { id: performanceId(String(raw.id)), posterUrl: raw.posterUrl ?? "", title: raw.title, venue: raw.venue ?? "", postingCount: postings.length, openPostingCount: postings.filter((item) => item.status === "OPEN").length, applicantCount: 0, pendingReviewCount: 0, previewPhotoUrls: [] };
}

function postingSummary(raw: RawPosting): PostingSummary {
  const quotaTotal = raw.roles.reduce((total, role) => total + (role.quota ?? 0), 0);
  return { id: postingId(String(raw.id)), performanceId: performanceId(String(raw.performanceId)), title: raw.title, deadline: raw.recruitmentEndsAt, phase: phase(raw.status), allowsMultipleRoles: raw.allowsMultipleRoles, roleCount: raw.roles.length, quotaTotal, applicantCount: 0, pendingReviewCount: 0, allRoundsClosed: raw.rounds.length > 0 && raw.rounds.every((round) => round.status === "CLOSED"), progress: emptyProgress, previewPhotoUrls: [], soleRoleId: raw.roles.length === 1 ? roleId(String(raw.roles[0]!.id)) : null };
}

function roleSummary(raw: RawRole, posting: RawPosting): RoleSummary {
  const rounds = posting.rounds.filter((round) => round.roleId === raw.id);
  const active = rounds.find((round) => round.status === "OPEN") ?? rounds.at(-1);
  return { id: roleId(String(raw.id)), postingId: postingId(String(raw.postingId)), name: raw.name, description: raw.description ?? "", quota: raw.quota ?? 0, gender: raw.genderCondition ?? "ANY", ageMin: raw.ageMin ?? 0, ageMax: raw.ageMax ?? 120, applicantCount: 0, activeRound: (active?.round ?? 1) as RoundNumber, allRoundsClosed: rounds.length > 0 && rounds.every((round) => round.status === "CLOSED"), progress: emptyProgress, counts: emptyCounts };
}

async function rawPerformances() { return request<readonly RawPerformance[]>("/performances"); }
async function rawPostings(id: PerformanceId) { return request<readonly RawPosting[]>(`/performances/${id}/postings`); }

export async function getAuditionTree(): Promise<AuditionTree> {
  const performances = await rawPerformances();
  return { performances: await Promise.all(performances.map(async (performance) => {
    const postings = await rawPostings(performanceId(String(performance.id)));
    return { id: performanceId(String(performance.id)), posterUrl: performance.posterUrl ?? "", title: performance.title, postings: postings.map((posting) => ({ id: postingId(String(posting.id)), title: posting.title, phase: phase(posting.status), applicantCount: 0, roleIds: posting.roles.map((role) => roleId(String(role.id))), soleRoleId: posting.roles.length === 1 ? roleId(String(posting.roles[0]!.id)) : null })) };
  })) };
}

export async function getPerformances(): Promise<PerformanceListResponse> {
  const performances = await rawPerformances();
  return { performances: await Promise.all(performances.map(async (performance) => performanceSummary(performance, await rawPostings(performanceId(String(performance.id)))))) };
}

export async function getPostings(performance: PerformanceId): Promise<PostingListResponse> {
  const [rawPerformance, postings] = await Promise.all([request<RawPerformance>(`/performances/${performance}`), rawPostings(performance)]);
  return { performance: { id: performanceId(String(rawPerformance.id)), posterUrl: rawPerformance.posterUrl ?? "", title: rawPerformance.title }, roleTemplates: rawPerformance.roleTemplates.map(roleTemplate), postings: postings.map(postingSummary) };
}

export async function getRoles(posting: PostingId): Promise<RoleListResponse> {
  const rawPosting = await request<RawPosting>(`/postings/${posting}`);
  const performance = await request<RawPerformance>(`/performances/${rawPosting.performanceId}`);
  return { performance: { id: performanceId(String(performance.id)), posterUrl: performance.posterUrl ?? "", title: performance.title }, posting: postingSummary(rawPosting), roles: rawPosting.roles.map((role) => roleSummary(role, rawPosting)) };
}

export function getAuditionBoard(role: RoleId, round: RoundNumber | null) {
  return request<AuditionBoardResponse>(round === null ? `/roles/${role}/screening-rounds/current/applications` : `/roles/${role}/screening-rounds/${round}/applications`);
}

export function saveReview(body: SaveReviewRequest) { return request<AuditionBoardResponse>(`/roles/${body.roleId}/screening-rounds/${body.round}/reviews`, { method: "PATCH", body: JSON.stringify({ applicationIds: body.applicationIds, status: body.status, memo: body.memo, note: body.note }) }); }
export function closeRound(body: CloseRoundRequest) { return request<AuditionBoardResponse>(`/roles/${body.roleId}/screening-rounds/${body.round}`, { method: "PATCH", body: JSON.stringify({ status: "CLOSED" }) }); }

export async function createPerformance(body: CreatePerformanceRequest) {
  await request<RawPerformance>("/performances", { method: "POST", body: JSON.stringify(body) });
  return getPerformances();
}

function postingMutation(body: CreatePostingRequest | UpdatePostingRequest) {
  const dateTime = (date: string | undefined, end: boolean) => {
    if (!date) return undefined;
    if (!end) return `${date}T00:00:00+09:00`;
    const dayAfter = new Date(`${date}T00:00:00Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    return `${dayAfter.toISOString().slice(0, 10)}T00:00:00+09:00`;
  };
  const fields = body.applicationFields?.filter((field) => field.enabled).map((field) => ({ key: field.id, label: field.label, required: field.required, custom: field.custom, section: field.section, inputType: field.inputType, order: field.order, config: field.config }));
  const start = dateTime(body.recruitmentStart, false);
  const end = dateTime(body.recruitmentEnd, true);
  const now = Date.now();
  const status = start && now < Date.parse(start) ? "UPCOMING" : end && now >= Date.parse(end) ? "CLOSED" : "OPEN";
  return { title: body.title, status, allowsMultipleRoles: body.allowsMultipleRoles, recruitmentStartsAt: start, recruitmentEndsAt: end, applicationGuide: body.applicationGuide, roles: body.roles, rounds: body.rounds, applicationFields: fields };
}

export async function createPosting(body: CreatePostingRequest): Promise<CreatePostingResponse> {
  const created = await request<RawPosting>(`/performances/${body.performanceId}/postings`, { method: "POST", body: JSON.stringify(postingMutation(body)) });
  return { ...(await getPostings(body.performanceId)), createdPostingId: postingId(String(created.id)) };
}

export async function updatePerformance(id: PerformanceId, body: UpdatePerformanceRequest) {
  const current = await request<RawPerformance>(`/performances/${id}`);
  await request<RawPerformance>(`/performances/${id}`, { method: "PATCH", body: JSON.stringify({ title: body.title ?? current.title, venue: body.venue ?? current.venue, posterUrl: body.posterFileId ?? current.posterUrl, roles: body.roleTemplates ?? [] }) });
  return getPerformances();
}

export function deletePerformance(id: PerformanceId) { return request<void>(`/performances/${id}`, { method: "DELETE" }); }

export async function getPostingManagement(id: PostingId): Promise<PostingManagementDetail> {
  const posting = await request<RawPosting>(`/postings/${id}`);
  const performance = await request<RawPerformance>(`/performances/${posting.performanceId}`);
  const firstRoleId = posting.roles[0]?.id;
  return { id: postingId(String(posting.id)), performanceId: performanceId(String(posting.performanceId)), performanceTitle: performance.title, title: posting.title, allowsMultipleRoles: posting.allowsMultipleRoles, recruitmentStart: posting.recruitmentStartsAt.slice(0, 10), recruitmentEnd: new Date(new Date(posting.recruitmentEndsAt).getTime() - 1).toISOString().slice(0, 10), phase: phase(posting.status), applicantCount: 0, roleTemplates: performance.roleTemplates.map(roleTemplate), roles: posting.roles.filter((role) => role.templateId !== null).map((role) => ({ templateId: String(role.templateId), quota: role.quota ?? 0 })), rounds: posting.rounds.filter((round) => round.roleId === firstRoleId).map((round) => ({ round: round.round as RoundNumber, name: round.name, date: round.date ?? "", note: round.note ?? "" })), applicationFields: posting.applicationFields.map((field) => ({ id: field.key, label: field.label, enabled: true, required: field.required, custom: field.custom, section: field.section as never, inputType: field.inputType as never, order: field.order, layout: "FULL", config: JSON.parse(field.configJson) as never })), applicationGuide: posting.applicationGuide ?? "" };
}

export async function updatePosting(id: PostingId, body: UpdatePostingRequest) {
  const current = await getPostingManagement(id);
  await request<RawPosting>(`/postings/${id}`, { method: "PATCH", body: JSON.stringify(postingMutation({ ...current, ...body })) });
  return getPostings(current.performanceId);
}

export function deletePosting(id: PostingId) { return request<void>(`/postings/${id}`, { method: "DELETE" }); }
function producerProfile(raw: RawProducerProfile): ProducerProfile {
  return { ...raw, contactName: raw.contactName ?? "", contactRole: raw.contactRole ?? "", logoUrl: raw.logoUrl ?? "", description: raw.description ?? "" };
}

export function getProducerProfile() { return request<RawProducerProfile>("/producers/me").then(producerProfile); }
export function updateProducerProfile(body: UpdateProducerProfileRequest) { return request<RawProducerProfile>("/producers/me", { method: "PATCH", body: JSON.stringify(body) }).then(producerProfile); }

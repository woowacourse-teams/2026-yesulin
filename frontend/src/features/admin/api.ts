import type { EventPaymentStatus } from "@/features/events/types";
import { withCsrfHeaders } from "../csrf";
import { safeUpload } from "../files/safe-upload";
import { reportUploadDiagnostic } from "../files/upload-diagnostics";
import { readErrorCode, readErrorMessage, readErrorDetail } from "../api-error";
import type {
  AuditionPostFileKind,
  AuditionPostUpload,
  AuditionPostWrite,
  EditableAuditionPost,
} from "../audition-posts/editing";
import type {
  AdminActorPage,
  AdminActorPageList,
  AdminAlertChatMembers,
  AdminOpenChatVisits,
  AdminAuditLogPage,
  AdminAudition,
  AdminAuditionPost,
  AdminAuditionPostAuthorFill,
  AdminAuditionPostAuthorLinkResult,
  AdminAuditionPostImport,
  AdminAuditionPostOwnerOverview,
  AdminAuditionPostStatus,
  AdminCompany,
  AdminCompanyAuthorOverview,
  AdminCompanyEditRequest,
  AdminCompanyStatus,
  AdminCompanyWrite,
  AdminEvent,
  AdminEventRegistration,
  AdminEventStatus,
  AdminEventWrite,
  AdminPostCompanyProfile,
  CompanyPhotoUpload,
  EventImageUpload,
  KopisCompanySearchResult,
  AdminDailyActivity,
  AdminFileDeletionResult,
  AdminLog,
  AdminLogEntry,
  AdminMemberStats,
  AdminOverview,
  AdminOtrRedirectReport,
  AdminProducer,
  AdminShow,
  AdminShowHostName,
  AdminShowStatus,
  AdminSubmissionDetail,
  AdminSubmissionSummary,
  AdminTimetableMessage,
  AdminTimetableMessages,
  AdminTimetableMessageStatus,
  AdminUnusedFileStatus,
  AdminUnusedFilesPage,
  AuditionStatus,
  MemberStatus,
} from "./types";

const API_BASE_PATH = "/api/v1/admin";

/** 운영 API는 세션 역할이 ADMIN일 때만 통과한다. 401·403은 화면이 로그인 상태로 되돌리는 신호다. */
export class AdminApiError extends Error {
  readonly status: number;
  /** 서버 오류 코드. 같은 상태 코드 안에서 화면이 다르게 안내해야 할 때 쓴다. */
  readonly code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

async function readAdminError(response: Response, fallback: string): Promise<AdminApiError> {
  const body: unknown = await response.json().catch(() => null);
  return new AdminApiError(response.status, readErrorMessage(body, readErrorDetail(body)) || fallback, readErrorCode(body));
}

async function getJson<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(`${API_BASE_PATH}${path}`, { method: "GET", credentials: "include" });
  if (!response.ok) throw await readAdminError(response, fallback);
  return response.json() as Promise<T>;
}

export function fetchOverview(): Promise<AdminOverview> {
  return getJson<AdminOverview>("/overview", "현황을 불러오지 못했습니다.");
}

export function fetchOtrRedirects(days = 14): Promise<AdminOtrRedirectReport> {
  return getJson<AdminOtrRedirectReport>(
    `/otr-redirects?days=${days}`,
    "OTR 공고 이동 통계를 불러오지 못했습니다.",
  );
}

export function fetchMemberStats(): Promise<AdminMemberStats> {
  return getJson<AdminMemberStats>("/member-stats", "회원 통계를 불러오지 못했습니다.");
}

export async function fetchActivity(): Promise<readonly AdminDailyActivity[]> {
  const body = await getJson<{ days: readonly AdminDailyActivity[] }>(
    "/activity",
    "최근 활동을 불러오지 못했습니다.",
  );
  return body.days;
}

export async function fetchProducers(status?: MemberStatus): Promise<readonly AdminProducer[]> {
  const query = status ? `?status=${status}` : "";
  const body = await getJson<{ producers: readonly AdminProducer[] }>(
    `/producers${query}`,
    "기획사 목록을 불러오지 못했습니다.",
  );
  return body.producers;
}

export async function fetchAuditions(status?: AuditionStatus): Promise<readonly AdminAudition[]> {
  const query = status ? `?status=${status}` : "";
  const body = await getJson<{ auditions: readonly AdminAudition[] }>(
    `/auditions${query}`,
    "공고 목록을 불러오지 못했습니다.",
  );
  return body.auditions;
}

export async function fetchShows(status?: AdminShowStatus): Promise<readonly AdminShow[]> {
  const query = status ? `?status=${status}` : "";
  const body = await getJson<{ shows: readonly AdminShow[] }>(
    `/shows${query}`,
    "무료 공연 목록을 불러오지 못했습니다.",
  );
  return body.shows;
}

/** 빈 문자열을 보내면 기획사 계정의 회사명으로 되돌린다. */
export async function updateShowHostName(showId: string, hostName: string): Promise<AdminShowHostName> {
  const response = await fetch(`${API_BASE_PATH}/shows/${encodeURIComponent(showId)}/host-name`, {
    method: "PUT",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ hostName: hostName.trim() }),
  });
  if (!response.ok) throw await readAdminError(response, "주최 이름을 바꾸지 못했습니다.");
  return response.json() as Promise<AdminShowHostName>;
}

export function fetchAuditLogs(page = 0): Promise<AdminAuditLogPage> {
  return getJson<AdminAuditLogPage>(
    `/audit-logs?page=${page}`,
    "변경 기록을 불러오지 못했습니다.",
  );
}

export function fetchUnusedFiles(options: {
  status?: AdminUnusedFileStatus;
  page?: number;
  size?: number;
} = {}): Promise<AdminUnusedFilesPage> {
  const params = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(options.size ?? 50),
  });
  if (options.status) params.set("status", options.status);
  return getJson<AdminUnusedFilesPage>(
    `/files/unreferenced?${params.toString()}`,
    "미사용 파일 목록을 불러오지 못했습니다.",
  );
}

export async function deleteUnusedFile(fileId: number, confirmationPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/files/${encodeURIComponent(String(fileId))}`, {
    method: "DELETE",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ confirmationPassword }),
  });
  if (!response.ok) throw await readAdminError(response, "파일을 삭제하지 못했습니다.");
}

export async function deleteUnusedFiles(
  fileIds: readonly number[],
  confirmationPassword: string,
): Promise<AdminFileDeletionResult> {
  const response = await fetch(`${API_BASE_PATH}/files/deletions`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ fileIds, confirmationPassword }),
  });
  if (!response.ok) throw await readAdminError(response, "선택한 파일을 삭제하지 못했습니다.");
  return response.json() as Promise<AdminFileDeletionResult>;
}

export const LOG_LINE_LIMITS = [100, 200, 500] as const;

type AdminLogResponse = Omit<AdminLog, "entries"> & {
  readonly entries?: readonly AdminLogEntry[];
};

/** 구조화 응답 배포 전 서버와 연결돼도 기존 문자열 로그를 안전한 LEGACY 항목으로 보여 준다. */
export function normalizeAdminLog(response: AdminLogResponse): AdminLog {
  const entries = response.entries ?? response.lines.map((line): AdminLogEntry => ({
    format: "LEGACY",
    timestamp: null,
    level: null,
    logger: null,
    thread: null,
    requestId: null,
    message: line,
    attributes: {},
    raw: line,
  }));
  return { ...response, entries };
}

/** date는 `yyyy-MM-dd` 한국 날짜다. 없으면 현재 로그 파일을 읽는다. */
export async function fetchLogs(keyword: string, limit: number, date: string | null = null): Promise<AdminLog> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (keyword.trim()) params.set("keyword", keyword.trim());
  if (date) params.set("date", date);
  const response = await getJson<AdminLogResponse>(
    `/logs?${params.toString()}`,
    "로그를 불러오지 못했습니다.",
  );
  return normalizeAdminLog(response);
}

export async function changeMemberStatus(memberId: number, status: MemberStatus): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/members/${memberId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw await readAdminError(response, "상태를 바꾸지 못했습니다.");
}

export async function fetchAdminSubmissions(auditionId: string): Promise<readonly AdminSubmissionSummary[]> {
  const body = await getJson<{ readonly submissions: readonly AdminSubmissionSummary[] }>(
    `/auditions/${encodeURIComponent(auditionId)}/submissions`,
    "지원서 목록을 불러오지 못했습니다.",
  );
  return body.submissions;
}

export function fetchAdminSubmission(submissionId: string): Promise<AdminSubmissionDetail> {
  return getJson<AdminSubmissionDetail>(
    `/submissions/${encodeURIComponent(submissionId)}`,
    "지원서 상세를 불러오지 못했습니다.",
  );
}

export async function deleteAdminSubmission(
  submissionId: string,
  confirmationPassword: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/submissions/${encodeURIComponent(submissionId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ confirmationPassword }),
  });
  if (!response.ok) throw await readAdminError(response, "지원서를 삭제하지 못했습니다.");
}

export function fetchTimetableMessages(status: AdminTimetableMessageStatus): Promise<AdminTimetableMessages> {
  return getJson<AdminTimetableMessages>(
    `/timetable-messages?status=${status}`,
    "문자 발송 대기열을 불러오지 못했습니다.",
  );
}

/** 직접 보낸 문자를 발송 완료로 표시한다. 이미 완료된 문자는 처음 기록을 유지한다. */
export async function completeTimetableMessages(messageIds: readonly number[]): Promise<readonly AdminTimetableMessage[]> {
  const response = await fetch(`${API_BASE_PATH}/timetable-messages/completion`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ messageIds }),
  });
  if (!response.ok) throw await readAdminError(response, "발송 완료로 표시하지 못했습니다.");
  const body = await response.json() as { readonly messages: readonly AdminTimetableMessage[] };
  return body.messages;
}

/** 최근 공고 200건. `ownerId`를 주면 그 기획사에 연결된 공고만 준다. */
export async function fetchAuditionPosts(ownerId?: number): Promise<readonly AdminAuditionPost[]> {
  const body = await getJson<{ readonly posts: readonly AdminAuditionPost[] }>(
    ownerId === undefined ? "/audition-posts" : `/audition-posts?ownerId=${ownerId}`,
    "공고 목록을 불러오지 못했습니다.",
  );
  return body.posts;
}

export function fetchAuditionPostOwners(): Promise<AdminAuditionPostOwnerOverview> {
  return getJson<AdminAuditionPostOwnerOverview>("/audition-post-owners", "업체별 공고를 불러오지 못했습니다.");
}

/** 원문 작성자를 기획사에 자동 연결한다. 그 작성자의 기존 공고 중 기획사가 없는 공고도 함께 연결된다. */
export async function linkAuditionPostAuthor(
  source: string,
  sourceAuthorId: string,
  ownerId: number,
): Promise<AdminAuditionPostAuthorLinkResult> {
  const response = await fetch(`${API_BASE_PATH}/audition-post-author-links`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ source, sourceAuthorId, ownerId }),
  });
  if (!response.ok) throw await readAdminError(response, "원문 작성자를 연결하지 못했습니다.");
  return response.json() as Promise<AdminAuditionPostAuthorLinkResult>;
}

/** 자동 연결을 지운다. 이미 연결된 공고는 그대로다. */
export async function unlinkAuditionPostAuthor(linkId: number): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/audition-post-author-links/${linkId}`, {
    method: "DELETE",
    credentials: "include",
    headers: await withCsrfHeaders(),
  });
  if (!response.ok) throw await readAdminError(response, "자동 연결을 해제하지 못했습니다.");
}

/** 원문 작성자 번호가 없는 공고의 번호를 원문에서 읽어 채운다. 한 번에 일부만 읽는다. */
export async function fillAuditionPostAuthors(beforeId: number | null): Promise<AdminAuditionPostAuthorFill> {
  const response = await fetch(`${API_BASE_PATH}/audition-post-author-links/fills`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ beforeId }),
  });
  if (!response.ok) throw await readAdminError(response, "원문 작성자 번호를 읽지 못했습니다.");
  return response.json() as Promise<AdminAuditionPostAuthorFill>;
}

/** 운영자가 고친 공고를 원문으로 다시 가져오려 하면 서버가 이 코드로 확인을 요청한다. */
export const AUDITION_POST_EDITED = "AUDITION_POST_EDITED";

/**
 * OTR 공고를 본문·사진·첨부까지 검토 전으로 가져온다. 이미 있으면 원문으로 교체한다.
 * 운영자가 고친 공고는 `overwriteEdited`로 확인받았을 때만 교체한다.
 */
export async function importOtrAuditionPost(otrId: string, overwriteEdited = false): Promise<AdminAuditionPostImport> {
  const response = await fetch(`${API_BASE_PATH}/audition-posts/otr-imports`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ otrId: otrId.trim(), overwriteEdited }),
  });
  if (!response.ok) throw await readAdminError(response, "OTR 공고를 가져오지 못했습니다.");
  return response.json() as Promise<AdminAuditionPostImport>;
}

export async function changeAuditionPostStatus(
  postId: number,
  status: AdminAuditionPostStatus,
): Promise<AdminAuditionPost> {
  const response = await fetch(`${API_BASE_PATH}/audition-posts/${postId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw await readAdminError(response, "공개 상태를 바꾸지 못했습니다.");
  return response.json() as Promise<AdminAuditionPost>;
}

/** 공고를 기획사 계정에 연결하거나(`ownerId`) 연결을 끊는다(null). 연결된 기획사는 그 공고를 직접 고칠 수 있다. */
export async function changeAuditionPostOwner(postId: number, ownerId: number | null): Promise<AdminAuditionPost> {
  const response = await fetch(`${API_BASE_PATH}/audition-posts/${postId}/owner`, {
    method: "PATCH",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ownerId }),
  });
  if (!response.ok) throw await readAdminError(response, "기획사 연결을 바꾸지 못했습니다.");
  return response.json() as Promise<AdminAuditionPost>;
}

/** 이 공고만 다른 공연사에 연결하거나(`companyId`) 연결을 끊는다(null). 같은 작성자의 다른 공고는 그대로다. */
export async function changeAuditionPostCompany(postId: number, companyId: number | null): Promise<AdminAuditionPost> {
  const response = await fetch(`${API_BASE_PATH}/audition-posts/${postId}/company`, {
    method: "PATCH",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ companyId }),
  });
  if (!response.ok) throw await readAdminError(response, "공연사 연결을 바꾸지 못했습니다.");
  return response.json() as Promise<AdminAuditionPost>;
}

export async function fetchCompanies(): Promise<readonly AdminCompany[]> {
  const response = await getJson<{ readonly companies: readonly AdminCompany[] }>(
    "/companies", "공연사 목록을 불러오지 못했습니다.",
  );
  return response.companies;
}

/** 새 공연사는 검토 전으로 만든다. 공개해야 공고와 공연사 화면에 보인다. */
export function createCompany(write: AdminCompanyWrite): Promise<AdminCompany> {
  return sendCompany("/companies", "POST", write, "공연사를 만들지 못했습니다.");
}

export function updateCompany(companyId: number, write: AdminCompanyWrite): Promise<AdminCompany> {
  return sendCompany(`/companies/${companyId}`, "PUT", write, "공연사 정보를 저장하지 못했습니다.");
}

export function changeCompanyStatus(companyId: number, status: AdminCompanyStatus): Promise<AdminCompany> {
  return sendCompany(`/companies/${companyId}/status`, "PATCH", { status }, "공개 상태를 바꾸지 못했습니다.");
}

export function fetchPostCompany(postId: number): Promise<AdminPostCompanyProfile> {
  return getJson<AdminPostCompanyProfile>(`/audition-posts/${postId}/company-profile`, "공연사 정보를 불러오지 못했습니다.");
}

/** 공고의 공연사 정보를 쓴다. 같은 OTR 작성자의 공고와 이후 가져오는 공고에도 같은 정보가 연결된다. */
export function savePostCompany(postId: number, company: AdminCompanyWrite, publish: boolean): Promise<AdminCompany> {
  return sendCompany(
    `/audition-posts/${postId}/company-profile`, "PUT", { company, publish }, "공연사 정보를 저장하지 못했습니다.",
  );
}

/** KOPIS 기획제작사를 이름으로 찾는다. "(주)" 같은 회사 형태 표시는 서버가 떼고 찾는다. */
export function fetchKopisCompanies(name: string): Promise<KopisCompanySearchResult> {
  return getJson<KopisCompanySearchResult>(
    `/kopis-companies?name=${encodeURIComponent(name)}`, "KOPIS에서 공연사를 찾지 못했습니다.",
  );
}

export async function fetchCompanyEditRequests(): Promise<readonly AdminCompanyEditRequest[]> {
  const response = await getJson<{ readonly requests: readonly AdminCompanyEditRequest[] }>(
    "/company-edit-requests", "수정 요청을 불러오지 못했습니다.",
  );
  return response.requests;
}

/**
 * 요청을 보고 다듬은 공연사 정보 전체로 고친다. 공개 상태는 그대로다.
 *
 * @param useRequestedPhoto 요청과 함께 온 사진을 대표 사진으로 쓸지
 * @param companyUpdatedAt 화면에 보인 공연사 정보의 갱신 시각. 그 사이 바뀌었으면 서버가 409로 거절한다.
 */
export function applyCompanyEditRequest(
  requestId: number,
  write: AdminCompanyWrite,
  useRequestedPhoto: boolean,
  companyUpdatedAt: string,
): Promise<AdminCompany> {
  return sendCompany(
    `/company-edit-requests/${requestId}/apply`, "POST", { company: write, useRequestedPhoto, companyUpdatedAt },
    "수정 요청을 적용하지 못했습니다.",
  );
}

/** 줄인 공연사 사진을 저장소로 바로 올리고 공개 주소를 준다. 공연사를 저장할 때 이 주소로 확정한다. */
export async function uploadCompanyPhoto(photo: Blob): Promise<string> {
  let photoUrl = "";
  await safeUpload({
    flow: "COMPANY_PHOTO",
    source: photo,
    originalFilename: "company-photo.jpg",
    requestUpload: async (metadata, { incidentId }) => {
      const response = await fetch(`${API_BASE_PATH}/company-photos/uploads`, {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaders({ "Content-Type": "application/json", "X-Request-Id": incidentId }),
        body: JSON.stringify({ contentType: metadata.contentType, size: metadata.size }),
      });
      if (!response.ok) throw await readAdminError(response, "사진을 올릴 준비를 하지 못했습니다.");
      const upload = await response.json() as CompanyPhotoUpload;
      photoUrl = upload.photoUrl ?? "";
      // 공연사 사진은 파일 ID 대신 공개 주소로 확정하므로 fileId는 쓰지 않는다.
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {},
    reportDiagnostic: reportUploadDiagnostic,
  });
  return photoUrl;
}

export async function rejectCompanyEditRequest(requestId: number): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/company-edit-requests/${requestId}/reject`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders(),
  });
  if (!response.ok) throw await readAdminError(response, "수정 요청을 반려하지 못했습니다.");
}

export function fetchCompanyAuthors(): Promise<AdminCompanyAuthorOverview> {
  return getJson<AdminCompanyAuthorOverview>("/audition-post-company-links", "작성자 목록을 불러오지 못했습니다.");
}

/** 원문 작성자를 이미 있는 공연사로 묶는다. 다른 공연사에 묶여 있었으면 그 작성자의 공고와 함께 옮긴다. */
export function linkCompanyAuthor(source: string, sourceAuthorId: string, companyId: number): Promise<unknown> {
  return sendJson("/audition-post-company-links", "POST", { source, sourceAuthorId, companyId }, "공연사로 묶지 못했습니다.");
}

/** 원문 작성자의 닉네임으로 검토 전 공연사를 만들고 묶는다. */
export function createCompanyFromAuthor(source: string, sourceAuthorId: string): Promise<unknown> {
  return sendJson(
    "/audition-post-company-links/companies", "POST", { source, sourceAuthorId }, "공연사를 만들지 못했습니다.",
  );
}

/** 번호가 있고 아직 묶지 않은 작성자마다 검토 전 공연사를 만든다. */
export async function createCompaniesFromAuthors(): Promise<number> {
  const result = await sendJson(
    "/audition-post-company-links/companies/bulk", "POST", {}, "공연사를 한꺼번에 만들지 못했습니다.",
  ) as { readonly createdCount: number };
  return result.createdCount;
}

export async function unlinkCompanyAuthor(linkId: number): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/audition-post-company-links/${linkId}`, {
    method: "DELETE",
    credentials: "include",
    headers: await withCsrfHeaders(),
  });
  if (!response.ok) throw await readAdminError(response, "묶음을 풀지 못했습니다.");
}

export function fetchOpenChatVisits(
  page = 0,
  range: { readonly startDate: string; readonly endDate: string } | null = null,
): Promise<AdminOpenChatVisits> {
  const params = new URLSearchParams({ page: String(page) });
  if (range) {
    params.set("startDate", range.startDate);
    params.set("endDate", range.endDate);
  }
  return getJson(`/openchat/visits?${params}`, "오픈채팅방 링크 방문을 불러오지 못했습니다.");
}

export function fetchAlertChatMembers(): Promise<AdminAlertChatMembers> {
  return getJson("/alert-chat-members", "오픈채팅방 인원을 불러오지 못했습니다.");
}

/** 지금 오픈채팅방 인원을 적는다. 적은 시각부터 올라오는 공고의 공개 조회수에만 쓰인다. */
export async function recordAlertChatMembers(memberCount: number): Promise<AdminAlertChatMembers> {
  return await sendJson("/alert-chat-members", "POST", { memberCount }, "오픈채팅방 인원을 저장하지 못했습니다.") as AdminAlertChatMembers;
}

export async function fetchAdminEvents(): Promise<readonly AdminEvent[]> {
  const response = await getJson<{ readonly events: readonly AdminEvent[] }>("/events", "이벤트 목록을 불러오지 못했습니다.");
  return response.events;
}

export function fetchAdminEvent(eventId: number): Promise<AdminEvent> {
  return getJson(`/events/${eventId}`, "이벤트를 불러오지 못했습니다.");
}

/** 새 이벤트는 검토 전으로 만들어지고, 공개해야 이벤트 화면과 메인 배너에 보인다. */
export async function createEvent(write: AdminEventWrite): Promise<AdminEvent> {
  return await sendJson("/events", "POST", write, "이벤트를 만들지 못했습니다.") as AdminEvent;
}

export async function updateEvent(eventId: number, write: AdminEventWrite): Promise<AdminEvent> {
  return await sendJson(`/events/${eventId}`, "PUT", write, "이벤트를 저장하지 못했습니다.") as AdminEvent;
}

export async function changeEventStatus(eventId: number, status: AdminEventStatus): Promise<AdminEvent> {
  return await sendJson(`/events/${eventId}/status`, "PATCH", { status }, "공개 상태를 바꾸지 못했습니다.") as AdminEvent;
}

/** 안내·신청자를 유지하면서 모집만 마감하거나 다시 연다. */
export async function changeEventRegistrationClosed(eventId: number, closed: boolean): Promise<AdminEvent> {
  return await sendJson(`/events/${eventId}/registration-status`, "PATCH", { closed }, "모집 상태를 바꾸지 못했습니다.") as AdminEvent;
}

/** 운영자가 확인한 입금 상태를 저장한다. */
export async function changeEventPaymentStatus(eventId: number, registrationId: number, paymentStatus: EventPaymentStatus): Promise<AdminEventRegistration> {
  return await sendJson(`/events/${eventId}/registrations/${registrationId}/payment-status`, "PATCH", { paymentStatus }, "입금 상태를 저장하지 못했습니다.") as AdminEventRegistration;
}

/** 글과 이미지를 되돌릴 수 없게 지운다. */
export async function deleteEvent(eventId: number): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/events/${eventId}`, {
    method: "DELETE",
    credentials: "include",
    headers: await withCsrfHeaders(),
  });
  if (!response.ok) throw await readAdminError(response, "이벤트를 지우지 못했습니다.");
}

/** 이벤트 참가 신청을 먼저 온 순서로 준다. 배우 사진 주소는 잠깐만 열린다. */
export async function fetchEventRegistrations(eventId: number): Promise<readonly AdminEventRegistration[]> {
  const response = await getJson<{ readonly registrations: readonly AdminEventRegistration[] }>(
    `/events/${eventId}/registrations`, "참가 신청자를 불러오지 못했습니다.",
  );
  return response.registrations;
}

/** 명함 희망 배우의 정보(CSV·JSON)와 사진을 zip 하나로 내려받는다. 브라우저 다운로드로 저장한다. */
export async function downloadBusinessCardArchive(eventId: number): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/events/${eventId}/registrations/business-card-archive`, {
    credentials: "include",
  });
  if (!response.ok) throw await readAdminError(response, "명함 자료를 내려받지 못했습니다.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `business-cards-event-${eventId}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 참가 신청을 지운다. 되돌릴 수 없고 사진도 함께 지운다. */
export async function deleteEventRegistration(eventId: number, registrationId: number): Promise<void> {
  const response = await fetch(`${API_BASE_PATH}/events/${eventId}/registrations/${registrationId}`, {
    method: "DELETE",
    credentials: "include",
    headers: await withCsrfHeaders(),
  });
  if (!response.ok) throw await readAdminError(response, "참가 신청을 지우지 못했습니다.");
}

/**
 * 이벤트 이미지를 원본 그대로 저장소에 올리고 공개 주소를 준다. 배너는 이미지 안에 글자가 있어 줄이지 않는다.
 * 이벤트를 저장할 때 서버가 이 주소로 업로드를 확정한다.
 */
export async function uploadEventImage(image: File): Promise<string> {
  let imageUrl = "";
  await safeUpload({
    flow: "EVENT_IMAGE",
    source: image,
    originalFilename: image.name,
    requestUpload: async (metadata, { incidentId }) => {
      const response = await fetch(`${API_BASE_PATH}/event-images/uploads`, {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaders({ "Content-Type": "application/json", "X-Request-Id": incidentId }),
        body: JSON.stringify({ contentType: metadata.contentType, size: metadata.size }),
      });
      if (!response.ok) throw await readAdminError(response, "이미지를 올릴 준비를 하지 못했습니다.");
      const upload = await response.json() as EventImageUpload;
      imageUrl = upload.imageUrl;
      // 이벤트 이미지는 파일 ID 대신 공개 주소로 확정하므로 fileId는 쓰지 않는다.
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {},
    reportDiagnostic: reportUploadDiagnostic,
  });
  return imageUrl;
}

/** 최근에 바뀐 페이지부터 보인다. 아이디 일부로 찾을 수 있다. */
export function fetchAdminActorPages(handle: string, page: number): Promise<AdminActorPageList> {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  if (handle.trim()) query.set("handle", handle.trim());
  return getJson<AdminActorPageList>(`/actor-pages?${query}`, "배우 페이지 목록을 불러오지 못했습니다.");
}

/** 연락처가 담겨 있어 화면에서만 쓰고 저장하지 않는다. */
export function fetchAdminActorPage(publicId: string): Promise<AdminActorPage> {
  return getJson<AdminActorPage>(`/actor-pages/${encodeURIComponent(publicId)}`, "배우 페이지를 불러오지 못했습니다.");
}

/** 잠그면 페이지가 비공개로 내려가고 사유가 배우 편집 화면에 보인다. 이미 잠겨 있으면 사유만 바꾼다. */
export async function lockActorPage(publicId: string, reason: string): Promise<AdminActorPage> {
  return await sendJson(`/actor-pages/${encodeURIComponent(publicId)}/lock`, "PUT", { reason: reason.trim() }, "배우 페이지를 잠그지 못했습니다.") as AdminActorPage;
}

/** 풀어도 비공개로 두고, 배우가 내용을 확인한 뒤 직접 다시 공개한다. */
export async function unlockActorPage(publicId: string): Promise<AdminActorPage> {
  return await sendJson(`/actor-pages/${encodeURIComponent(publicId)}/lock`, "DELETE", undefined, "잠금을 풀지 못했습니다.") as AdminActorPage;
}

/** 옛 아이디는 바로 풀려 옛 주소는 끊기고 다른 배우가 곧바로 쓸 수 있다. */
export async function changeActorPageHandle(publicId: string, handle: string): Promise<AdminActorPage> {
  return await sendJson(`/actor-pages/${encodeURIComponent(publicId)}/handle`, "PUT", { handle }, "아이디를 바꾸지 못했습니다.") as AdminActorPage;
}

async function sendJson(path: string, method: string, body: unknown, fallback: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method,
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readAdminError(response, fallback);
  return response.json();
}

async function sendCompany(path: string, method: string, body: unknown, fallback: string): Promise<AdminCompany> {
  return await sendJson(path, method, body, fallback) as AdminCompany;
}

export function fetchAuditionPostForEdit(postId: string): Promise<EditableAuditionPost> {
  return getJson<EditableAuditionPost>(
    `/audition-posts/${encodeURIComponent(postId)}`,
    "공고를 불러오지 못했습니다.",
  );
}

export async function updateAuditionPost(postId: string, write: AuditionPostWrite): Promise<AdminAuditionPost> {
  const response = await fetch(`${API_BASE_PATH}/audition-posts/${encodeURIComponent(postId)}`, {
    method: "PUT",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(write),
  });
  if (!response.ok) throw await readAdminError(response, "공고를 저장하지 못했습니다.");
  return response.json() as Promise<AdminAuditionPost>;
}

/** 원문 없이 공고를 쓴다. 검토 전으로 만들어지고 목록에서 공개하기를 눌러야 공개된다. */
export async function createAuditionPost(write: AuditionPostWrite): Promise<AdminAuditionPost> {
  const response = await fetch(`${API_BASE_PATH}/audition-posts`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(write),
  });
  if (!response.ok) throw await readAdminError(response, "공고를 만들지 못했습니다.");
  return response.json() as Promise<AdminAuditionPost>;
}

/**
 * 공고 사진·첨부를 저장소로 바로 올리고 공개 주소를 돌려준다. 공고를 저장할 때 서버가 이 주소로 업로드를 확정하므로
 * 별도 완료 요청은 없다. WebKit 파일 접근 실패에 대비한 메모리 복사와 재시도는 다른 업로드와 같은 방식을 쓴다.
 */
export async function uploadAuditionPostFile(kind: AuditionPostFileKind, file: File): Promise<string> {
  let publicUrl = "";
  await safeUpload({
    flow: "AUDITION_POST_FILE",
    source: file,
    originalFilename: file.name,
    requestUpload: async (metadata, { incidentId }) => {
      const response = await fetch(`${API_BASE_PATH}/audition-posts/uploads`, {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaders({ "Content-Type": "application/json", "X-Request-Id": incidentId }),
        body: JSON.stringify({ kind, filename: metadata.originalFilename, contentType: metadata.contentType, size: metadata.size }),
      });
      if (!response.ok) throw await readAdminError(response, "파일을 올릴 준비를 하지 못했습니다.");
      const upload = await response.json() as AuditionPostUpload;
      publicUrl = upload.publicUrl;
      // 공고 파일은 파일 ID 대신 공개 주소로 확정하므로 fileId는 쓰지 않는다.
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {},
    reportDiagnostic: reportUploadDiagnostic,
  });
  return publicUrl;
}

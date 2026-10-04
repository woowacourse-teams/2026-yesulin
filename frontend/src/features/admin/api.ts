import { withCsrfHeaders } from "../csrf";
import { readErrorMessage, readErrorDetail } from "../api-error";
import type {
  AdminAuditLogPage,
  AdminAudition,
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

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

async function readAdminError(response: Response, fallback: string): Promise<AdminApiError> {
  const body: unknown = await response.json().catch(() => null);
  return new AdminApiError(response.status, readErrorMessage(body, readErrorDetail(body)) || fallback);
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

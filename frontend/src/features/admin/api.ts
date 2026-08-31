import { withCsrfHeaders } from "../csrf";
import { readErrorMessage, readErrorDetail } from "../api-error";
import type {
  AdminAudition,
  AdminAuditLog,
  AdminLog,
  AdminLogEntry,
  AdminOverview,
  AdminProducer,
  AdminSubmissionDetail,
  AdminSubmissionSummary,
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

export async function fetchAuditLogs(): Promise<readonly AdminAuditLog[]> {
  const body = await getJson<{ logs: readonly AdminAuditLog[] }>(
    "/audit-logs",
    "변경 기록을 불러오지 못했습니다.",
  );
  return body.logs;
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

export async function fetchLogs(keyword: string, limit: number): Promise<AdminLog> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (keyword.trim()) params.set("keyword", keyword.trim());
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

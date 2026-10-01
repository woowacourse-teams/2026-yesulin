import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type {
  AdminAudition,
  AdminAuditLog,
  AdminDailyActivity,
  AdminMemberStats,
  AdminOverview,
  AdminProducer,
  AdminShowStatus,
  AdminSubmissionSummary,
  AuditionStatus,
  MemberStatus,
} from "@/features/admin/types";
import { mockSessionRole } from "./auth-handlers";
import { changeMockShowHostName, listAdminShows } from "./show-handlers";

/**
 * 운영 대시보드 화면 확인용 메모리 목이다. `admin@`으로 시작하는 이메일로 목 로그인하면 ADMIN 세션이 된다.
 * 실제 로그인 플래그가 켜지면 세션이 실제 백엔드에 있으므로 운영 API도 그대로 넘긴다.
 */
const realLoginEnabled = frontendEnvironment.producerLoginEnabled;

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });

function daysAgo(days: number, hour = 10): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour - 9, 0, 0, 0);
  return date.toISOString();
}

const producers: Mutable<AdminProducer>[] = [
  {
    memberId: 11,
    email: "pending@troupe.example",
    status: "PENDING",
    joinedAt: daysAgo(1, 14),
    companyName: "새봄 컴퍼니",
    contactName: "김새봄",
    contactRole: "대표",
    phone: "010-1234-5678",
    performanceCount: 0,
    auditionCount: 0,
  },
  {
    memberId: 12,
    email: "office@yesulin-troupe.example",
    status: "ACTIVE",
    joinedAt: daysAgo(40),
    companyName: "극단 예술in",
    contactName: "이연출",
    contactRole: "연출",
    phone: "010-2222-3333",
    performanceCount: 3,
    auditionCount: 4,
  },
  {
    memberId: 13,
    email: "hello@moonlight.example",
    status: "ACTIVE",
    joinedAt: daysAgo(5, 11),
    companyName: "달빛 프로덕션",
    contactName: null,
    contactRole: null,
    phone: "010-4444-5555",
    performanceCount: 1,
    auditionCount: 1,
  },
];

const auditions: Mutable<AdminAudition>[] = [
  {
    auditionId: "mock-audition-hamlet",
    title: "햄릿 배우 모집",
    status: "PUBLISHED",
    companyName: "극단 예술in",
    performanceTitle: "햄릿",
    createdAt: daysAgo(12),
    publishedAt: daysAgo(11),
    submissionCount: 18,
  },
  {
    auditionId: "mock-audition-moonlight",
    title: "달빛 아래 소극장 앙상블",
    status: "PUBLISHED",
    companyName: "달빛 프로덕션",
    performanceTitle: "달빛 아래 소극장",
    createdAt: daysAgo(4),
    publishedAt: daysAgo(3),
    submissionCount: 6,
  },
  {
    auditionId: "mock-audition-draft",
    title: "가을 낭독극 출연진",
    status: "DRAFT",
    companyName: "극단 예술in",
    performanceTitle: "가을 낭독극",
    createdAt: daysAgo(2),
    publishedAt: null,
    submissionCount: 0,
  },
  {
    auditionId: "mock-audition-closed",
    title: "여름밤의 연극 주연",
    status: "CLOSED",
    companyName: "극단 예술in",
    performanceTitle: "여름밤의 연극",
    createdAt: daysAgo(60),
    publishedAt: daysAgo(58),
    submissionCount: 42,
  },
];

const submissionsByAudition: Record<string, AdminSubmissionSummary[]> = {
  "mock-audition-hamlet": [
    {
      submissionId: "mock-submission-1",
      applicantName: "박배우",
      applicantEmail: "actor1@example.com",
      applicantPhone: "010-9000-0001",
      submittedAt: daysAgo(2, 21),
      selectedRoles: [{ roleId: 1, roleName: "햄릿" }],
    },
    {
      submissionId: "mock-submission-2",
      applicantName: "최배우",
      applicantEmail: null,
      applicantPhone: "010-9000-0002",
      submittedAt: daysAgo(1, 9),
      selectedRoles: [{ roleId: 2, roleName: "오필리어" }, { roleId: 3, roleName: "앙상블" }],
    },
  ],
};

const auditLogs: AdminAuditLog[] = [
  {
    id: 2,
    actorMemberId: 900,
    action: "MEMBER_STATUS_CHANGED",
    targetType: "MEMBER",
    targetId: 13,
    detail: "PENDING -> ACTIVE",
    createdAt: daysAgo(4, 16),
  },
  {
    id: 1,
    actorMemberId: 900,
    action: "SUBMISSION_DELETED",
    targetType: "SUBMISSION",
    targetId: 77,
    detail: "지원서 삭제",
    createdAt: daysAgo(9, 13),
  },
];
let nextAuditLogId = 3;

const AUDIT_LOG_PAGE_SIZE = 10;
const WEEK_DAYS = 7;

const withinLastWeek = (value: string | null) =>
  value !== null && Date.now() - Date.parse(value) <= WEEK_DAYS * 24 * 60 * 60 * 1000;
const countAuditions = (status: AuditionStatus) => auditions.filter((audition) => audition.status === status).length;

const OTR_AUDITIONS = 2;
const OTR_SUBMISSIONS = 11;

function overview(): AdminOverview {
  const shows = listAdminShows();
  return {
    applicants: APPLICANTS,
    producers: producers.length,
    pendingProducers: producers.filter((producer) => producer.status === "PENDING").length,
    activeProducers: producers.filter((producer) => producer.status === "ACTIVE").length,
    performances: producers.reduce((sum, producer) => sum + producer.performanceCount, 0),
    auditions: auditions.length,
    draftAuditions: countAuditions("DRAFT"),
    publishedAuditions: countAuditions("PUBLISHED"),
    closedAuditions: countAuditions("CLOSED"),
    submissions: auditions.reduce((sum, audition) => sum + audition.submissionCount, 0),
    newProducersInLastWeek: producers.filter((producer) => withinLastWeek(producer.joinedAt)).length,
    newSubmissionsInLastWeek: 9,
    otrAuditions: OTR_AUDITIONS,
    otrSubmissions: OTR_SUBMISSIONS,
    newOtrSubmissionsInLastWeek: 4,
    shows: shows.length,
    openShows: shows.filter((show) => show.status === "OPEN").length,
    reservedTickets: shows.reduce((sum, show) => sum + show.reservedTickets, 0),
    newReservationsInLastWeek: shows.reduce((sum, show) => sum + show.reservationCount, 0),
  };
}

const APPLICANTS = 128;

function memberStats(): AdminMemberStats {
  return {
    applicants: APPLICANTS,
    producers: producers.length,
    signupMethods: { kakao: 96, naver: 21, google: 13, email: producers.length, unknownApplicants: 0 },
    today: { applicants: 3, producers: 1 },
    lastWeek: { applicants: 17, producers: producers.filter((producer) => withinLastWeek(producer.joinedAt)).length },
    lastMonth: { applicants: 54, producers: producers.length },
  };
}

/** 오늘을 포함한 14일을 한국 날짜로 만든다. 값은 화면 확인용 고정 패턴이다. */
const ACTIVITY_PATTERN = [
  [2, 0, 1, 0, 0], [4, 0, 3, 1, 2], [1, 1, 0, 0, 0], [0, 0, 2, 0, 1], [5, 0, 4, 2, 3], [3, 1, 1, 0, 0], [2, 0, 0, 1, 4],
  [6, 0, 5, 1, 2], [1, 0, 2, 0, 1], [0, 0, 0, 0, 0], [4, 1, 3, 2, 5], [7, 0, 6, 1, 3], [2, 0, 1, 0, 2], [3, 1, 2, 1, 1],
] as const;

function activity(): AdminDailyActivity[] {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return ACTIVITY_PATTERN.map(([applicants, newProducers, submissions, otrSubmissions, reservations], index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (ACTIVITY_PATTERN.length - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      applicantSignups: applicants,
      producerSignups: newProducers,
      submissions,
      otrSubmissions,
      reservations,
      reservedTickets: reservations * 2,
    };
  });
}

/** 실제 백엔드처럼 ADMIN 세션이 아니면 401·403으로 거절해 로그인 화면 전환을 확인할 수 있게 한다. */
function rejectNonAdmin() {
  const role = mockSessionRole();
  if (!role) return apiError(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.");
  if (role !== "ADMIN") return apiError(403, "AUTH_FORBIDDEN", "접근 권한이 없습니다.");
  return null;
}

const isMemberStatus = (value: unknown): value is MemberStatus => value === "PENDING" || value === "ACTIVE";
const isShowStatus = (value: string | null): value is AdminShowStatus =>
  value === "DRAFT" || value === "OPEN" || value === "CLOSED";
const isAuditionStatus = (value: string | null): value is AuditionStatus =>
  value === "DRAFT" || value === "PUBLISHED" || value === "CLOSED";

export const adminHandlers = [
  http.get("/api/v1/admin/overview", async () => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    return rejectNonAdmin() ?? HttpResponse.json(overview());
  }),

  http.get("/api/v1/admin/member-stats", async () => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    return rejectNonAdmin() ?? HttpResponse.json(memberStats());
  }),

  http.get("/api/v1/admin/activity", async () => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    return rejectNonAdmin() ?? HttpResponse.json({ days: activity() });
  }),

  http.get("/api/v1/admin/producers", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const status = new URL(request.url).searchParams.get("status");
    const filtered = isMemberStatus(status) ? producers.filter((producer) => producer.status === status) : producers;
    const ordered = [...filtered].sort((left, right) =>
      Number(left.status !== "PENDING") - Number(right.status !== "PENDING")
      || right.joinedAt.localeCompare(left.joinedAt));
    return HttpResponse.json({ producers: ordered });
  }),

  http.get("/api/v1/admin/auditions", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const status = new URL(request.url).searchParams.get("status");
    const filtered = isAuditionStatus(status) ? auditions.filter((audition) => audition.status === status) : auditions;
    return HttpResponse.json({
      auditions: [...filtered].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    });
  }),

  http.get("/api/v1/admin/shows", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const status = new URL(request.url).searchParams.get("status");
    return HttpResponse.json({ shows: listAdminShows(isShowStatus(status) ? status : undefined) });
  }),

  http.get("/api/v1/admin/audit-logs", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const requested = Number(new URL(request.url).searchParams.get("page") ?? 0);
    const page = Number.isInteger(requested) && requested >= 0 ? requested : 0;
    const start = page * AUDIT_LOG_PAGE_SIZE;
    return HttpResponse.json({
      logs: auditLogs.slice(start, start + AUDIT_LOG_PAGE_SIZE),
      page,
      size: AUDIT_LOG_PAGE_SIZE,
      totalElements: auditLogs.length,
      totalPages: Math.ceil(auditLogs.length / AUDIT_LOG_PAGE_SIZE),
    });
  }),

  http.patch("/api/v1/admin/members/:memberId/status", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(160);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const producer = producers.find((candidate) => candidate.memberId === Number(params.memberId));
    if (!producer) return apiError(404, "MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다.");
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    if (!isMemberStatus(body?.status)) return apiError(400, "INVALID_REQUEST", "요청 값을 확인해 주세요.");
    const previous = producer.status;
    producer.status = body.status;
    auditLogs.unshift({
      id: nextAuditLogId,
      actorMemberId: 900,
      action: "MEMBER_STATUS_CHANGED",
      targetType: "MEMBER",
      targetId: producer.memberId,
      detail: `${previous} -> ${producer.status}`,
      createdAt: new Date().toISOString(),
    });
    nextAuditLogId += 1;
    return HttpResponse.json({ memberId: producer.memberId, status: producer.status });
  }),

  http.put("/api/v1/admin/shows/:showId/host-name", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(160);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const body = (await request.json().catch(() => null)) as { hostName?: unknown } | null;
    if (typeof body?.hostName !== "string" || body.hostName.trim().length > 50) {
      return apiError(400, "INVALID_REQUEST", "요청 값을 확인해 주세요.");
    }
    const result = changeMockShowHostName(String(params.showId), body.hostName);
    if (!result) return apiError(404, "SHOW_NOT_FOUND", "공연을 찾을 수 없습니다.");
    auditLogs.unshift({
      id: nextAuditLogId,
      actorMemberId: 900,
      action: "SHOW_HOST_NAME_CHANGED",
      targetType: "SHOW",
      targetId: 1,
      detail: result.hostName ? "주최 이름 직접 입력" : "주최 이름을 계정 기획사명으로 되돌림",
      createdAt: new Date().toISOString(),
    });
    nextAuditLogId += 1;
    return HttpResponse.json(result);
  }),

  http.get("/api/v1/admin/auditions/:auditionId/submissions", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    await delay(160);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    return HttpResponse.json({ submissions: submissionsByAudition[String(params.auditionId)] ?? [] });
  }),

  http.get("/api/v1/admin/submissions/:submissionId", async () => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    return rejectNonAdmin()
      ?? apiError(404, "SUBMISSION_NOT_FOUND", "목 환경에서는 지원서 상세를 제공하지 않습니다.");
  }),

  http.delete("/api/v1/admin/submissions/:submissionId", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(200);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const body = (await request.json().catch(() => null)) as { confirmationPassword?: unknown } | null;
    if (typeof body?.confirmationPassword !== "string" || !body.confirmationPassword.trim()) {
      return apiError(403, "ADMIN_DELETION_CONFIRMATION_FAILED", "삭제 확인 비밀번호가 올바르지 않습니다.");
    }
    for (const [auditionId, list] of Object.entries(submissionsByAudition)) {
      const index = list.findIndex((submission) => submission.submissionId === params.submissionId);
      if (index < 0) continue;
      list.splice(index, 1);
      const audition = auditions.find((candidate) => candidate.auditionId === auditionId);
      if (audition) audition.submissionCount = Math.max(0, audition.submissionCount - 1);
      return new HttpResponse(null, { status: 204 });
    }
    return apiError(404, "SUBMISSION_NOT_FOUND", "지원서를 찾을 수 없습니다.");
  }),
];

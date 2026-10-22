import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import {
  ALERT_CHAT_MAX_MEMBER_COUNT,
  type AdminAlertChatMemberEntry,
  type AdminAlertChatMembers,
} from "@/features/admin/types";
import { AUDITION_POST_CATEGORIES, type AuditionPost, type AuditionPostSummary } from "@/features/audition-posts/types";
import { mockSessionRole } from "./auth-handlers";
import { companyHandlers, mockCompanyOfPost } from "./company-handlers";

/**
 * 메인 공고 목록·상세 화면 확인용 메모리 목. 실제 서버는 운영자가 공개한 공고를 원문 작성 최신순으로 준다.
 * 숨긴 공고 상세의 원문 이동(302)은 서버 렌더링에서만 처리하므로 목에는 공개 공고만 둔다.
 * 운영자 가져오기는 OTR과 저장소에 실제로 접속해야 의미가 있으므로 목으로 흉내 내지 않고 실제 서버로 넘긴다.
 * 공고 알림 오픈채팅방 인원은 메모리에 두고, 서버처럼 공고마다 올린 시각의 인원을 준다. 새로고침하면 초기화된다.
 */
function daysFromToday(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

const realLoginEnabled = frontendEnvironment.producerLoginEnabled;
const HOUR_MS = 60 * 60 * 1000;
const INITIAL_ALERT_CHAT_MEMBERS = 109;
/** 최근 것부터. */
const alertChatHistory: AdminAlertChatMemberEntry[] = [
  { id: 2, memberCount: 181, recordedAt: new Date(Date.now() - 24 * HOUR_MS).toISOString() },
  { id: 1, memberCount: 150, recordedAt: new Date(Date.now() - 10 * 24 * HOUR_MS).toISOString() },
];

function alertChatMembersAt(postedAt: string | null): number {
  if (!postedAt) return INITIAL_ALERT_CHAT_MEMBERS;
  const posted = Date.parse(postedAt);
  return alertChatHistory.find((entry) => Date.parse(entry.recordedAt) <= posted)?.memberCount ?? INITIAL_ALERT_CHAT_MEMBERS;
}

function alertChatOverview(): AdminAlertChatMembers {
  return {
    currentMemberCount: alertChatHistory[0]?.memberCount ?? INITIAL_ALERT_CHAT_MEMBERS,
    initialMemberCount: INITIAL_ALERT_CHAT_MEMBERS,
    history: [...alertChatHistory],
  };
}

function rejectNonAdmin() {
  const role = mockSessionRole();
  if (!role) return HttpResponse.json({ code: "AUTH_UNAUTHENTICATED", message: "로그인이 필요합니다." }, { status: 401 });
  if (role !== "ADMIN") return HttpResponse.json({ code: "AUTH_FORBIDDEN", message: "접근 권한이 없습니다." }, { status: 403 });
  return null;
}

type MockPost = Omit<AuditionPost, "alertChatMembers">;

const POSTS: readonly MockPost[] = [
  {
    id: 1,
    category: "연극",
    title: "[프로젝트 운베칸트] 낭독극 <체크 포인트> 배우 모집",
    authorName: "운베칸트",
    pay: "회차당 10만원",
    deadlineText: daysFromToday(2),
    deadline: daysFromToday(2),
    closed: false,
    viewCount: 12,
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<p>낭독극 &lt;체크 포인트&gt;에 함께할 배우를 모집합니다.</p>"
      + "<img src=\"/images/performances/moonlight.jpg\" alt=\"모집 공고 1\">"
      + "<p><strong>모집 배역</strong></p><ul><li>남자 2명 (20~30대)</li><li>여자 1명 (20대)</li></ul>"
      + "<p>지원: <a href=\"https://forms.gle/example\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">구글 폼</a></p>",
    tags: ["낭독극", "배우모집"],
    attachments: [],
    source: "OTR",
    sourceUrl: "https://otr.co.kr/audition/?vid=22391",
    updatedAt: new Date().toISOString(),
    company: null,
  },
  {
    id: 2,
    category: "연극",
    title: "[팀플레이] 대학로 연극 매표 아르바이트 모집합니다.",
    authorName: "팀플레이예술기획",
    pay: "면접 후 결정",
    deadlineText: daysFromToday(27),
    deadline: daysFromToday(27),
    closed: false,
    viewCount: 12,
    postedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<p>저희 기획사에서 진행하는 연극의 매표 아르바이트 모집합니다.</p>"
      + "<p><span><strong>주말 공휴일 필수 근무</strong></span></p>"
      + "<p>[모집 요강]</p><p>★ 담당업무 : 연극 공연장 매표 업무</p><p>★ 제출서류 : 첨부 지원서식 1부</p>",
    tags: ["연극", "연극매표", "아르바이트"],
    attachments: [{
      name: "팀플레이예술기획 매표 아르바이트 지원서식.doc",
      contentType: "application/msword",
      size: 44_544,
      url: "/images/yesulin-logo.png",
    }],
    source: "OTR",
    sourceUrl: "https://otr.co.kr/audition/?vid=22392",
    updatedAt: new Date().toISOString(),
    company: null,
  },
  {
    id: 3,
    category: "퍼포먼스",
    title: "총페이 1,200,000원 여성댄스팀 공연멤버 모집(총 7회 공연)",
    authorName: "김현수",
    pay: "총 1,200,000원",
    deadlineText: "채용 시 마감",
    deadline: null,
    closed: false,
    viewCount: 12,
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<p>여성 댄스팀 공연 멤버를 모집합니다. 총 7회 공연입니다.</p>",
    tags: [],
    attachments: [],
    source: "OTR",
    sourceUrl: "https://otr.co.kr/audition/?vid=22393",
    updatedAt: new Date().toISOString(),
    company: null,
  },
  {
    id: 4,
    category: "뮤지컬",
    title: "창작 뮤지컬 <여름밤> 앙상블 오디션",
    authorName: "여름밤 컴퍼니",
    pay: "협의",
    deadlineText: daysFromToday(-5),
    deadline: daysFromToday(-5),
    closed: true,
    viewCount: 87,
    postedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<img src=\"/images/performances/summerplay.jpg\" alt=\"포스터\"><p>앙상블 배우를 모집합니다.</p>",
    tags: ["뮤지컬"],
    attachments: [],
    source: "OTR",
    sourceUrl: "https://otr.co.kr/audition/?vid=22394",
    updatedAt: new Date().toISOString(),
    company: null,
  },
];

const openChatVisits = new Map<string, number>();

function recordOpenChatVisit(target: string) {
  if (mockSessionRole() !== "ADMIN") openChatVisits.set(target, (openChatVisits.get(target) ?? 0) + 1);
  return new HttpResponse(null, { status: 204 });
}

function toSummary(post: MockPost): AuditionPostSummary {
  const thumbnail = /<img[^>]*src="([^"]+)"/.exec(post.bodyHtml);
  return {
    id: post.id,
    category: post.category,
    title: post.title,
    authorName: post.authorName,
    pay: post.pay,
    deadlineText: post.deadlineText,
    deadline: post.deadline,
    closed: post.closed,
    viewCount: post.viewCount,
    postedAt: post.postedAt,
    alertChatMembers: alertChatMembersAt(post.postedAt),
    thumbnailUrl: thumbnail ? thumbnail[1] : null,
    attachmentCount: post.attachments.length,
  };
}

export const auditionPostHandlers = [
  ...companyHandlers((postIds) => POSTS.filter((post) => postIds.includes(post.id))
    .sort((left, right) => (right.postedAt ?? "").localeCompare(left.postedAt ?? ""))
    .map(toSummary)),
  http.get("/api/v1/public/audition-posts", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "0");
    const size = Number(url.searchParams.get("size") ?? "12");
    const includeClosed = url.searchParams.get("includeClosed") === "true";
    const category = url.searchParams.get("category")?.trim();
    if (category !== undefined && !AUDITION_POST_CATEGORIES.some((supported) => supported === category)) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "지원하지 않는 공고 분류입니다." }, { status: 400 });
    }
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 48) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "페이지 범위가 올바르지 않습니다." }, { status: 400 });
    }
    const sorted = POSTS.filter((post) => !category || post.category === category)
      .sort((left, right) => (right.postedAt ?? "").localeCompare(left.postedAt ?? ""));
    const matched = includeClosed ? sorted : sorted.filter((post) => !post.closed);
    return HttpResponse.json({
      posts: matched.slice(page * size, page * size + size).map(toSummary),
      page,
      size,
      totalPages: Math.ceil(matched.length / size),
      totalElements: matched.length,
      openCount: sorted.filter((post) => !post.closed).length,
      allCount: sorted.length,
    });
  }),

  http.get("/api/v1/public/audition-posts/:postId", async ({ params }) => {
    await delay(200);
    const post = POSTS.find((candidate) => String(candidate.id) === String(params.postId));
    if (!post) {
      return HttpResponse.json({ code: "AUDITION_POST_NOT_FOUND", message: "공고를 찾을 수 없습니다." }, { status: 404 });
    }
    const detail: AuditionPost = { ...post, alertChatMembers: alertChatMembersAt(post.postedAt), company: mockCompanyOfPost(post.id) };
    return HttpResponse.json(detail);
  }),

  http.post("/api/v1/public/audition-posts/:postId/views", async ({ params }) => {
    const post = POSTS.find((candidate) => String(candidate.id) === String(params.postId));
    return post ? new HttpResponse(null, { status: 204 }) : HttpResponse.json({ code: "AUDITION_POST_NOT_FOUND", message: "공고를 찾을 수 없습니다." }, { status: 404 });
  }),

  http.post("/api/v1/public/audition-posts/:postId/openchat-visits", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    const post = POSTS.find((candidate) => String(candidate.id) === String(params.postId));
    if (!post) return HttpResponse.json({ code: "AUDITION_POST_NOT_FOUND", message: "공고를 찾을 수 없습니다." }, { status: 404 });
    const otrId = post.sourceUrl ? /[?&]vid=([0-9]+)/.exec(post.sourceUrl)?.[1] : undefined;
    return recordOpenChatVisit(otrId ? `OTR:${otrId}` : `YESULIN:${post.id}`);
  }),

  http.post("/api/v1/public/otr/:externalId/openchat-visits", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    if (!/^[0-9]{1,30}$/.test(String(params.externalId))) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "OTR 공고 번호가 올바르지 않습니다." }, { status: 400 });
    }
    return recordOpenChatVisit(`OTR:${params.externalId}`);
  }),

  http.get("/api/v1/admin/openchat/visits", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const page = Number(new URL(request.url).searchParams.get("page") ?? "0");
    if (!Number.isInteger(page) || page < 0) return HttpResponse.json({ code: "INVALID_REQUEST", message: "페이지 범위가 올바르지 않습니다." }, { status: 400 });
    const posts = [...POSTS].sort((left, right) => right.id - left.id).map((post) => {
      const otrId = post.sourceUrl ? /[?&]vid=([0-9]+)/.exec(post.sourceUrl)?.[1] : undefined;
      const visits = openChatVisits.get(otrId ? `OTR:${otrId}` : `YESULIN:${post.id}`);
      return {
        postId: post.id,
        title: post.title,
        status: "PUBLISHED",
        postedAt: post.postedAt,
        visitCount: visits ?? 0,
      };
    });
    return HttpResponse.json({ posts: posts.slice(page * 20, (page + 1) * 20), page, size: 20, totalPages: Math.ceil(posts.length / 20), totalElements: posts.length });
  }),

  http.get("/api/v1/admin/alert-chat-members", async () => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    return rejectNonAdmin() ?? HttpResponse.json(alertChatOverview());
  }),

  http.post("/api/v1/admin/alert-chat-members", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(150);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const { memberCount } = await request.json() as { readonly memberCount?: unknown };
    if (typeof memberCount !== "number" || !Number.isInteger(memberCount) || memberCount < 1 || memberCount > ALERT_CHAT_MAX_MEMBER_COUNT) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "오픈채팅방 인원이 올바르지 않습니다." }, { status: 400 });
    }
    alertChatHistory.unshift({
      id: Math.max(0, ...alertChatHistory.map((entry) => entry.id)) + 1,
      memberCount,
      recordedAt: new Date().toISOString(),
    });
    return HttpResponse.json(alertChatOverview(), { status: 201 });
  }),

  http.get("/api/v1/admin/audition-posts", () => passthrough()),
  http.post("/api/v1/admin/audition-posts", () => passthrough()),
  http.post("/api/v1/admin/audition-posts/uploads", () => passthrough()),
  http.post("/api/v1/admin/audition-posts/otr-imports", () => passthrough()),
  http.get("/api/v1/admin/audition-posts/:postId", () => passthrough()),
  http.put("/api/v1/admin/audition-posts/:postId", () => passthrough()),
  http.patch("/api/v1/admin/audition-posts/:postId/status", () => passthrough()),
  http.patch("/api/v1/admin/audition-posts/:postId/owner", () => passthrough()),
  http.get("/api/v1/admin/audition-post-owners", () => passthrough()),
  http.post("/api/v1/admin/audition-post-author-links", () => passthrough()),
  http.post("/api/v1/admin/audition-post-author-links/fills", () => passthrough()),
  http.delete("/api/v1/admin/audition-post-author-links/:linkId", () => passthrough()),
  http.get("/api/v1/producers/me/audition-posts", () => passthrough()),
  http.post("/api/v1/producers/me/audition-posts", () => passthrough()),
  http.post("/api/v1/producers/me/audition-posts/uploads", () => passthrough()),
  http.get("/api/v1/producers/me/audition-posts/:postId", () => passthrough()),
  http.put("/api/v1/producers/me/audition-posts/:postId", () => passthrough()),
];

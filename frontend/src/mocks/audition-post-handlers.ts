import { delay, http, HttpResponse, passthrough } from "msw";
import type { AuditionPost, AuditionPostSummary } from "@/features/audition-posts/types";

/**
 * 메인 공고 목록·상세 화면 확인용 메모리 목. 실제 서버는 운영자가 게시한 공고를 원문 작성 최신순으로 준다.
 * 운영자 가져오기는 OTR과 저장소에 실제로 접속해야 의미가 있으므로 목으로 흉내 내지 않고 실제 서버로 넘긴다.
 */
function daysFromToday(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

const POSTS: readonly AuditionPost[] = [
  {
    id: 1,
    category: "연극",
    title: "[프로젝트 운베칸트] 낭독극 <체크 포인트> 배우 모집",
    authorName: "운베칸트",
    pay: "회차당 10만원",
    deadlineText: daysFromToday(2),
    deadline: daysFromToday(2),
    closed: false,
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<p>낭독극 &lt;체크 포인트&gt;에 함께할 배우를 모집합니다.</p>"
      + "<img src=\"/images/performances/moonlight.jpg\" alt=\"모집 공고 1\">"
      + "<p><strong>모집 배역</strong></p><ul><li>남자 2명 (20~30대)</li><li>여자 1명 (20대)</li></ul>"
      + "<p>지원: <a href=\"https://forms.gle/example\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">구글 폼</a></p>",
    tags: ["낭독극", "배우모집"],
    attachments: [],
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
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
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<p>여성 댄스팀 공연 멤버를 모집합니다. 총 7회 공연입니다.</p>",
    tags: [],
    attachments: [],
    updatedAt: new Date().toISOString(),
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
    postedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    bodyHtml: "<img src=\"/images/performances/summerplay.jpg\" alt=\"포스터\"><p>앙상블 배우를 모집합니다.</p>",
    tags: ["뮤지컬"],
    attachments: [],
    updatedAt: new Date().toISOString(),
  },
];

function toSummary(post: AuditionPost): AuditionPostSummary {
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
    postedAt: post.postedAt,
    thumbnailUrl: thumbnail ? thumbnail[1] : null,
    attachmentCount: post.attachments.length,
  };
}

export const auditionPostHandlers = [
  http.get("/api/v1/public/audition-posts", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "0");
    const size = Number(url.searchParams.get("size") ?? "12");
    const includeClosed = url.searchParams.get("includeClosed") === "true";
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 48) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "페이지 범위가 올바르지 않습니다." }, { status: 400 });
    }
    const sorted = [...POSTS].sort((left, right) => (right.postedAt ?? "").localeCompare(left.postedAt ?? ""));
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
    return HttpResponse.json(post);
  }),

  http.get("/api/v1/admin/audition-posts", () => passthrough()),
  http.post("/api/v1/admin/audition-posts/otr-imports", () => passthrough()),
  http.patch("/api/v1/admin/audition-posts/:postId/status", () => passthrough()),
];

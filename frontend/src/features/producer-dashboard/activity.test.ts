import { describe, expect, it } from "vitest";
import type { ProducerAuditionPost } from "@/features/audition-posts/producer-api";
import type { ReviewSummary } from "@/features/pdf-reviews/types";
import type { ProducerShowSummary } from "@/features/shows/types";
import { getRecentDashboardWork, getUpcomingDashboardSchedule, hasStartedShowSession, isPublicProducerShow, isRecruitingPost } from "./activity";

const now = Date.parse("2026-11-17T06:00:00Z");

function post(overrides: Partial<ProducerAuditionPost> = {}): ProducerAuditionPost {
  return {
    id: 1, title: "공고", category: "연극", deadlineText: "오늘까지", status: "PUBLISHED", closed: false,
    viewCount: 0, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-11-16T06:00:00Z", ...overrides,
  };
}

function review(createdAt: string): ReviewSummary {
  return { id: "review-1", title: "심사함", createdAt, roleCount: 2, entryCount: 8 };
}

function show(overrides: Partial<ProducerShowSummary> = {}): ProducerShowSummary {
  return {
    id: "show-1", title: "공연", genre: "PLAY", posterUrl: "", status: "OPEN", hidden: false,
    sessionCount: 1, reservedTickets: 0, nextSessionStartsAt: "2026-11-17T12:00:00Z",
    createdAt: "2026-10-01T00:00:00Z", ...overrides,
  };
}

describe("공연사 대시보드", () => {
  it("공개 상태로 모집 중인 공고와 숨김·작성 중이 아닌 무료 공연을 집계한다", () => {
    expect([post(), post({ closed: true }), post({ status: "PENDING" }), post({ status: "HIDDEN" })].filter(isRecruitingPost)).toHaveLength(1);
    expect([show(), show({ status: "CLOSED" }), show({ status: "DRAFT" }), show({ hidden: true })].filter(isPublicProducerShow)).toHaveLength(2);
  });

  it("두 작업 유형을 시각순으로 정렬하고 최근 30일의 최대 두 건을 보여준다", () => {
    const posts = [post(), post({ id: 2, updatedAt: "2026-10-18T06:00:00Z" }), post({ id: 3, updatedAt: "2026-11-19T00:00:00Z" })];
    const rows = getRecentDashboardWork(posts, [review("2026-11-17T05:00:00Z")], now);
    expect(rows.map((row) => row.href)).toEqual(["/producers/pdf-reviews", "/producers/audition-posts/1/edit"]);
    expect(rows[0]?.detail).toContain("지원서 항목 8건");
    expect(getRecentDashboardWork([posts[1]!], [], now)).toHaveLength(1);
    expect(getRecentDashboardWork([post({ updatedAt: "2026-10-18T05:59:59Z" })], [review("invalid")], now)).toEqual([]);
  });

  it("시작한 회차나 비공개 공연을 빼고 가까운 공연 일정을 보여준다", () => {
    const shows = [show(), show({ hidden: true, nextSessionStartsAt: "2026-11-17T07:00:00Z" }), show({ nextSessionStartsAt: "2026-11-17T06:00:00Z" })];
    const rows = getUpcomingDashboardSchedule(shows, now);
    expect(rows.map((row) => row.key)).toEqual(["show-show-1"]);
    expect(rows[0]?.detail).toBe("공연 회차 21:00");
    expect(getUpcomingDashboardSchedule(shows, Date.parse("2026-11-17T15:00:00Z"))).toEqual([]);
  });

  it("열어 둔 대시보드에서 공개 공연의 회차가 시작되는 경계만 감지한다", () => {
    const startsAt = Date.parse("2026-11-17T12:00:00Z");
    expect(hasStartedShowSession([show()], now, startsAt)).toBe(true);
    expect(hasStartedShowSession([show()], startsAt, startsAt + 60_000)).toBe(false);
    expect(hasStartedShowSession([show({ hidden: true })], now, startsAt)).toBe(false);
  });
});

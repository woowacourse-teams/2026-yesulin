import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicEventSummary } from "@/features/events/types";
import { EventsRoute } from "./event-list";

vi.mock("next/navigation", () => ({ usePathname: () => "/events" }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: null }) }));

const event = (overrides: Partial<PublicEventSummary>): PublicEventSummary => ({
  id: 1, title: "네트워킹 데이", summary: "배우와 제작자가 만나는 자리", startsOn: "2026-10-29", endsOn: "2026-11-09",
  phase: "ONGOING", coverImageUrl: "https://example.com/poster.jpg", registrationStatus: "OPEN", ...overrides,
});

describe("이벤트 목록 포스터 카드", () => {
  it("표지 이미지를 3:4 포스터 틀에 담고 진행 상태를 배지로 보여 준다", () => {
    const html = renderToStaticMarkup(<EventsRoute initialEvents={[event({})]} />);
    expect(html).toContain('class="notebook-poster-card"');
    expect(html).toContain('class="notebook-poster-image"');
    expect(html).toMatch(/data-kind="open"[^>]*>진행 중</);
  });

  it("신청이 닫힌 이벤트는 마감 문구를, 끝난 이벤트는 흐린 포스터를 보여 준다", () => {
    const html = renderToStaticMarkup(<EventsRoute initialEvents={[
      event({ id: 2, registrationStatus: "FULL" }),
      event({ id: 3, phase: "ENDED", registrationStatus: "DISABLED" }),
    ]} />);
    expect(html).toMatch(/data-kind="closed"[^>]*>선착순 마감</);
    expect(html).toMatch(/data-ended="true"[\s\S]*data-kind="closed"[^>]*>마감</);
  });

  it("표지 이미지가 없으면 제목으로 기본 포스터를 그린다", () => {
    const html = renderToStaticMarkup(<EventsRoute initialEvents={[event({ coverImageUrl: null })]} />);
    expect(html).toContain('class="notebook-poster-default"');
    expect(html).not.toContain("notebook-poster-image");
  });
});

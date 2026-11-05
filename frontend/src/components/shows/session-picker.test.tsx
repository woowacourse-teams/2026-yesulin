import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { groupSessionsByDay } from "@/features/shows/format";
import type { PublicShow, PublicShowSession } from "@/features/shows/types";
import { SessionPicker } from "./session-picker";

const session = (id: number, startsAt: string, bookable = true): PublicShowSession => ({ id, startsAt, remainingSeats: 100, maxTicketCount: 10, bookable });
const sessions = [
  session(1, "2026-11-17T10:30:00Z"),
  session(2, "2026-11-18T10:30:00Z", false),
  session(3, "2026-11-21T04:00:00Z"),
  session(4, "2026-11-21T09:00:00Z"),
];
const show = { status: "OPEN", sessions } as unknown as PublicShow;

describe("공연 회차 날짜 띠", () => {
  it("한국 날짜 기준으로 같은 날 회차를 묶는다", () => {
    const days = groupSessionsByDay(sessions);
    expect(days.map((day) => [day.label, day.sessions.length])).toEqual([["11월 17일 (화)", 1], ["11월 18일 (수)", 1], ["11월 21일 (토)", 2]]);
  });

  it("고른 회차의 날짜를 펼치고 그날 시작 시각을 라디오로 보여 준다", () => {
    const html = renderToStaticMarkup(<SessionPicker show={show} sectionId="show-sessions" selectedId={3} onSelect={() => undefined} />);
    expect(html).toContain('aria-label="11월 21일 (토), 회차 2개"');
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="11월 21일 \(토\)/);
    expect(html).toContain(">13:00<");
    expect(html).toContain(">18:00<");
    expect(html).not.toContain(">19:30<");
    expect(html.match(/type="radio"/g)).toHaveLength(2);
  });

  it("예매할 수 있는 회차가 없는 날짜는 흐리게 표시한다", () => {
    const html = renderToStaticMarkup(<SessionPicker show={show} sectionId="show-sessions" selectedId={null} onSelect={() => undefined} />);
    expect(html).toMatch(/aria-label="11월 18일 \(수\), 회차 1개"[^>]*data-closed="true"/);
  });
});

import { describe, expect, it } from "vitest";
import { buildAttentions, countUpcomingSessions } from "./insights";
import type { AdminOverview, AdminShow, AdminShowSession } from "./types";

const NOW = Date.parse("2026-09-30T00:00:00Z");

const session = (startsAt: string, capacity: number, reservedTickets: number): AdminShowSession => ({
  sessionId: Math.floor(Math.random() * 100_000),
  startsAt,
  capacity,
  reservedTickets,
  reservationCount: 0,
  canceledReservationCount: 0,
});

const show = (status: AdminShow["status"], sessions: readonly AdminShowSession[]): AdminShow => ({
  showId: `${status}-${sessions.length}`,
  title: "햄릿",
  status,
  companyName: null,
  createdAt: "2026-09-01T00:00:00Z",
  totalCapacity: 0,
  reservedTickets: 0,
  reservationCount: 0,
  canceledReservationCount: 0,
  sessions,
});

const overview = (pendingProducers: number) => ({ pendingProducers }) as AdminOverview;

describe("admin insights", () => {
  it("예매 중 공연의 앞으로 남은 회차만 매진·매진 임박으로 센다", () => {
    const counts = countUpcomingSessions([
      show("OPEN", [
        session("2026-10-01T10:00:00Z", 10, 10),
        session("2026-10-02T10:00:00Z", 100, 95),
        session("2026-10-03T10:00:00Z", 100, 90),
        session("2026-09-29T10:00:00Z", 10, 10),
      ]),
      show("CLOSED", [session("2026-10-01T10:00:00Z", 10, 10)]),
    ], NOW);

    expect(counts).toEqual({ soldOut: 1, nearlyFull: 1 });
  });

  it("확인할 항목이 없으면 빈 목록을 돌려준다", () => {
    expect(buildAttentions(overview(0), [], NOW)).toEqual([]);
  });

  it("인증 대기 기획사와 매진 회차를 해당 섹션으로 안내한다", () => {
    const attentions = buildAttentions(overview(2), [show("OPEN", [session("2026-10-01T10:00:00Z", 5, 5)])], NOW);

    expect(attentions.map((attention) => [attention.id, attention.section])).toEqual([
      ["pending-producers", "producers"],
      ["sold-out-sessions", "shows"],
    ]);
  });
});

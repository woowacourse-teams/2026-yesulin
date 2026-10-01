import type { AdminDailyActivity, AdminOverview, AdminShow } from "./types";

/** 잔여석이 정원의 이 비율 미만이면 매진 임박으로 본다. */
const NEARLY_FULL_REMAINING_RATIO = 0.1;

export type AdminAttention = {
  readonly id: "pending-producers" | "sold-out-sessions" | "nearly-full-sessions";
  readonly tone: "warn" | "info";
  readonly message: string;
  readonly section: "producers" | "shows";
};

type UpcomingSessionCounts = {
  readonly soldOut: number;
  readonly nearlyFull: number;
};

/** 예매 중 공연의 앞으로 남은 회차만 본다. 지난 회차의 매진은 확인할 일이 아니다. */
export function countUpcomingSessions(shows: readonly AdminShow[], now: number): UpcomingSessionCounts {
  let soldOut = 0;
  let nearlyFull = 0;
  for (const show of shows) {
    if (show.status !== "OPEN") continue;
    for (const session of show.sessions) {
      if (Date.parse(session.startsAt) <= now || session.capacity <= 0) continue;
      const remaining = session.capacity - session.reservedTickets;
      if (remaining <= 0) soldOut += 1;
      else if (remaining < session.capacity * NEARLY_FULL_REMAINING_RATIO) nearlyFull += 1;
    }
  }
  return { soldOut, nearlyFull };
}

/** 개요 첫머리에 보여 줄 확인 항목이다. 해당 없는 항목은 빼서 빈 목록이면 확인할 일이 없다는 뜻이다. */
export function buildAttentions(
  overview: AdminOverview,
  shows: readonly AdminShow[],
  now: number,
): readonly AdminAttention[] {
  const sessions = countUpcomingSessions(shows, now);
  const attentions: AdminAttention[] = [];
  if (overview.pendingProducers > 0) {
    attentions.push({
      id: "pending-producers",
      tone: "warn",
      message: `이메일 인증을 마치지 않은 기획사가 ${overview.pendingProducers}곳 있어요.`,
      section: "producers",
    });
  }
  if (sessions.soldOut > 0) {
    attentions.push({
      id: "sold-out-sessions",
      tone: "info",
      message: `매진된 예정 회차가 ${sessions.soldOut}개 있어요.`,
      section: "shows",
    });
  }
  if (sessions.nearlyFull > 0) {
    attentions.push({
      id: "nearly-full-sessions",
      tone: "info",
      message: `잔여석이 10% 미만인 예정 회차가 ${sessions.nearlyFull}개 있어요.`,
      section: "shows",
    });
  }
  return attentions;
}

export function sumActivity(
  days: readonly AdminDailyActivity[],
  pick: (day: AdminDailyActivity) => number,
): number {
  return days.reduce((sum, day) => sum + pick(day), 0);
}

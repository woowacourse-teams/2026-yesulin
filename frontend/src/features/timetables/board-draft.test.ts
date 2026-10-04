import { describe, expect, it } from "vitest";
import {
  assignmentsOf,
  autoAssign,
  changeCount,
  draftFrom,
  isAdditional,
  moveActor,
  noticesOnSave,
  problemsOf,
  rebaseDraft,
} from "./board-draft";
import type { TimetableActor, TimetableBoard } from "./types";

const actor = (id: number, name: string, startTime: string | null = null, invited = false): TimetableActor => ({
  id,
  name,
  phone: `010-0000-000${id}`,
  slot: startTime ? { date: "2026-10-10", startTime, endTime: "" } : null,
  invited,
  previousSlot: null,
  actorChangedAt: null,
  registeredAt: "2026-10-01T00:00:00Z",
});

const board = (actors: TimetableActor[], overrides: Partial<TimetableBoard> = {}): TimetableBoard => ({
  title: "남극장 2차 오디션",
  organizerName: "남극장",
  organizerPhone: "010-9999-0000",
  location: "",
  guide: "",
  status: "DRAFT",
  publishedAt: null,
  selfChangeLocked: false,
  selfChangeNoticeHours: 24,
  slotMinutes: 30,
  slotCapacity: 1,
  windows: [{ date: "2026-10-10", startTime: "10:00", endTime: "11:30" }],
  actors,
  requests: [],
  ...overrides,
});

describe("timetable board draft", () => {
  it("비어 있는 배우를 등록 순서대로 가장 이른 빈 칸부터 채우고 남는 배우 수를 알려 준다", () => {
    const current = board([actor(1, "김배우"), actor(2, "이배우", "10:00"), actor(3, "박배우"), actor(4, "최배우")]);

    const result = autoAssign(current, draftFrom(current));

    expect(result.draft.slots).toEqual({ 1: "2026-10-10T10:30", 2: "2026-10-10T10:00", 3: "2026-10-10T11:00", 4: null });
    expect(result.placed).toBe(2);
    expect(result.unplaced).toBe(1);
  });

  it("정원만큼 같은 칸에 채운다", () => {
    const current = board([actor(1, "김배우"), actor(2, "이배우"), actor(3, "박배우")], { slotCapacity: 2 });

    expect(autoAssign(current, draftFrom(current)).draft.slots)
      .toEqual({ 1: "2026-10-10T10:00", 2: "2026-10-10T10:00", 3: "2026-10-10T10:30" });
  });

  it("옮긴 배우만 이전 시간과 함께 저장 요청에 담는다", () => {
    const current = board([actor(1, "김배우", "10:00"), actor(2, "이배우")]);
    let draft = moveActor(draftFrom(current), 1, "2026-10-10T11:00");
    draft = moveActor(draft, 2, "2026-10-10T10:00");

    expect(assignmentsOf(current, draft)).toEqual([
      { actorId: 1, previous: { date: "2026-10-10", startTime: "10:00" }, next: { date: "2026-10-10", startTime: "11:00" } },
      { actorId: 2, previous: null, next: { date: "2026-10-10", startTime: "10:00" } },
    ]);
    expect(changeCount(current, moveActor(draft, 1, "2026-10-10T10:00"))).toBe(1);
  });

  it("정원 초과·시간대 밖·안내한 배우의 빈 시간을 저장 전에 알려 준다", () => {
    const current = board([actor(1, "김배우", "10:00", true), actor(2, "이배우", "10:30", true)], { status: "PUBLISHED" });
    let draft = moveActor(draftFrom(current), 2, "2026-10-10T10:00");
    expect(problemsOf(current, draft).map((problem) => problem.key)).toEqual(["capacity-2026-10-10T10:00"]);

    draft = moveActor(draft, 1, "2026-10-10T12:00");
    draft = moveActor(draft, 2, null);
    expect(problemsOf(current, draft).map((problem) => problem.key)).toEqual(["outside-1", "unassigned-2"]);
  });

  it("확정 뒤 저장하면 옮긴 배우와 새로 시간을 받은 배우에게 갈 안내를 미리 보여 준다", () => {
    const current = board(
      [actor(1, "김배우", "10:00", true), actor(2, "이배우", "10:30", true), actor(3, "박배우")],
      { status: "PUBLISHED" },
    );
    let draft = moveActor(draftFrom(current), 1, "2026-10-10T11:00");
    draft = moveActor(draft, 3, "2026-10-10T10:00");

    expect(noticesOnSave(current, draft)).toEqual({ changed: ["김배우"], invited: ["박배우"] });
  });

  it("새 보드를 받으면 기획사가 옮긴 배우만 편집본을 유지하고 나머지는 서버 값을 따른다", () => {
    const before = board([actor(1, "김배우", "10:00", true), actor(2, "이배우", "10:30", true)], { status: "PUBLISHED" });
    const draft = moveActor(draftFrom(before), 1, "2026-10-10T11:00");
    const after = board(
      [actor(1, "김배우", "10:00", true), actor(2, "이배우", "11:00", true), actor(3, "박배우")],
      { status: "PUBLISHED" },
    );

    expect(rebaseDraft(before, after, draft).slots).toEqual({
      1: "2026-10-10T11:00",
      2: "2026-10-10T11:00",
      3: null,
    });
  });

  it("방금 등록한 배우만 골라 빈 칸에 배정하고 확정 뒤 등록한 배우를 추가 합격자로 본다", () => {
    const current = board([actor(1, "김배우"), actor(2, "이배우"), actor(3, "박배우")]);

    expect(autoAssign(current, draftFrom(current), [3]).draft.slots).toEqual({ 1: null, 2: null, 3: "2026-10-10T10:00" });

    const published = board(
      [actor(1, "김배우", "10:00", true), { ...actor(2, "이배우"), registeredAt: "2026-10-03T00:00:00Z" }],
      { status: "PUBLISHED", publishedAt: "2026-10-02T00:00:00Z" },
    );
    expect(published.actors.map((item) => isAdditional(published, item))).toEqual([false, true]);
  });
});

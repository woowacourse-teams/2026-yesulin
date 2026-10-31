import { describe, expect, it } from "vitest";
import { draftFor, emptySchedule, scheduleAssignments, slotError, updateSlot } from "./roster-schedule";
import type { RosterActor } from "./timetables";

const actor: RosterActor = { id: 1, name: "가람", phone: null, email: "", roleName: "",
  sourceReviewId: "review", sourceApplicantId: "entry", sourceDecision: "PASS", slot: { date: "2026-11-01", startTime: "12:00:00" } };
describe("자유 시간 배정", () => {
  it.each([["", "12:00"], ["2026-11-01", ""], ["2026-02-29", "12:00"], ["2026-13-01", "12:00"],
    ["2026-11-01", "24:00"], ["2026-11-01", "12:00:01"], ["0999-01-01", "12:00"]])("잘못된 날짜/시각을 차단한다: %s %s", (date, time) => {
    expect(slotError(date, time)).not.toBe("");
  });
  it("윤년·분 단위·해제를 허용한다", () => {
    expect(slotError("2028-02-29", "14:07")).toBe("");
    expect(slotError("", "")).toBe("");
  });
  it("최초 편집 기준을 유지하고 원래 시간으로 되돌리면 변경에서 제외한다", () => {
    const state = updateSlot(emptySchedule(), actor, "2026-11-02", "13:00");
    const refreshed = { ...actor, slot: { date: "2026-11-03", startTime: "14:00:00" } };
    expect(draftFor(state, refreshed).previousSlot).toEqual(actor.slot);
    expect(scheduleAssignments(updateSlot(state, refreshed, "", ""))).toEqual([{ actorId: 1, slot: null, previousSlot: actor.slot }]);
    expect(scheduleAssignments(updateSlot(state, actor, "2026-11-01", "12:00"))).toEqual([]);
  });
});

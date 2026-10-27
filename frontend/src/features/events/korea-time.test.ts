import { describe, expect, it } from "vitest";
import { formatKoreaDeadline, fromKoreaLocalInput, toKoreaLocalInput } from "./korea-time";
import { emptyEventDraft, eventDraftProblem, writeOfEvent } from "./draft";

describe("한국 시각 입력", () => {
  it("입력 칸 값을 한국 시각으로 보고 서버 시각과 오간다", () => {
    expect(fromKoreaLocalInput("2026-11-02T09:00")).toBe("2026-11-02T00:00:00.000Z");
    expect(toKoreaLocalInput("2026-11-02T00:00:00Z")).toBe("2026-11-02T09:00");
    expect(fromKoreaLocalInput("")).toBeNull();
    expect(fromKoreaLocalInput("2026-11-02")).toBeNull();
    expect(toKoreaLocalInput(null)).toBe("");
  });

  it("마감 시각을 요일과 오전·오후로 쓴다", () => {
    expect(formatKoreaDeadline("2026-11-02T00:00:00Z")).toBe("11월 2일(월) 오전 9:00");
    expect(formatKoreaDeadline("2026-11-09T09:30:00Z")).toBe("11월 9일(월) 오후 6:30");
  });
});

describe("이벤트 폼의 명함 제작 마감", () => {
  const ready = { ...emptyEventDraft(), title: "제목", body: "개요", registrationEnabled: true };

  it("참가 신청서를 켠 글만 마감 시각을 보낸다", () => {
    expect(writeOfEvent({ ...ready, businessCardClosesAt: "2026-11-02T09:00" }).businessCardClosesAt).toBe("2026-11-02T00:00:00.000Z");
    expect(writeOfEvent({ ...ready, businessCardClosesAt: "" }).businessCardClosesAt).toBeNull();
    expect(writeOfEvent({ ...ready, registrationEnabled: false, businessCardClosesAt: "2026-11-02T09:00" }).businessCardClosesAt).toBeNull();
  });

  it("마감 시각 형식이 틀리면 먼저 알려 준다", () => {
    expect(eventDraftProblem({ ...ready, businessCardClosesAt: "2026-11-02" })).toContain("명함 제작 마감");
    expect(eventDraftProblem({ ...ready, businessCardClosesAt: "2026-11-02T09:00" })).toBeNull();
  });
});

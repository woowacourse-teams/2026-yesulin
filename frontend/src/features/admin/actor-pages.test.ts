import { describe, expect, it } from "vitest";
import { adminActorHandleLabel, adminActorPageRoutes, adminActorPageStatus } from "./actor-pages";

describe("admin actor page status", () => {
  it("shows the lock first because locking also makes the page private", () => {
    expect(adminActorPageStatus({ status: "PRIVATE", locked: true, autoHiddenReason: null }).label).toBe("잠김");
  });

  it("tells automatic hiding apart from the actor's own choice", () => {
    expect(adminActorPageStatus({ status: "PRIVATE", locked: false, autoHiddenReason: "MISSING_REQUIRED" }))
      .toEqual({ label: "자동 비공개(필수 항목 누락)", tone: "hidden" });
    expect(adminActorPageStatus({ status: "PRIVATE", locked: false, autoHiddenReason: "UNDER_14" }).label).toBe("자동 비공개(만 14세 미만)");
    expect(adminActorPageStatus({ status: "PRIVATE", locked: false, autoHiddenReason: null }).label).toBe("비공개");
    expect(adminActorPageStatus({ status: "PUBLIC", locked: false, autoHiddenReason: null }).label).toBe("공개 중");
  });
});

it("labels handles and builds detail routes", () => {
  expect(adminActorHandleLabel("min.zzun_")).toBe("@min.zzun_");
  expect(adminActorHandleLabel(null)).toBe("아이디 없음");
  expect(adminActorPageRoutes.detail("00000000-0000-4000-8000-000000000001")).toBe("/admin/actor-pages/00000000-0000-4000-8000-000000000001");
});

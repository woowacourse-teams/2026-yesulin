import { describe, expect, it } from "vitest";
import { adminSectionHref, parseAdminSection } from "./sections";

describe("admin sections", () => {
  it("알려진 탭만 열고 나머지는 개요로 돌린다", () => {
    expect(parseAdminSection("shows")).toBe("shows");
    expect(parseAdminSection(["members", "shows"])).toBe("members");
    expect(parseAdminSection("unknown")).toBe("overview");
    expect(parseAdminSection(undefined)).toBe("overview");
  });

  it("개요는 쿼리 없이, 나머지는 tab 쿼리로 연결한다", () => {
    expect(adminSectionHref("overview")).toBe("/admin");
    expect(adminSectionHref("audit")).toBe("/admin?tab=audit");
  });
});

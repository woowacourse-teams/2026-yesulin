import { describe, expect, it } from "vitest";
import {
  defaultStatusForWork,
  initialFilters,
  initialFiltersFromRoute,
  shouldClearMismatchOnlyAfterBulkReview,
} from "./filters";

describe("심사 작업 필터", () => {
  it("검토 완료는 합격자를 기본으로 보여준다", () => {
    expect(defaultStatusForWork("DONE")).toBe("PASS");
    expect(initialFilters("DONE").status).toBe("PASS");
  });

  it("검토 대기는 전체 상태를 기본으로 유지한다", () => {
    expect(defaultStatusForWork("PENDING")).toBe("ALL");
    expect(initialFilters("PENDING").status).toBe("ALL");
  });

  it("조건 불일치 지원자를 일괄 불합격 처리하면 불일치 필터를 해제한다", () => {
    expect(shouldClearMismatchOnlyAfterBulkReview("FAIL")).toBe(true);
    expect(shouldClearMismatchOnlyAfterBulkReview("PASS")).toBe(false);
    expect(shouldClearMismatchOnlyAfterBulkReview("ETC")).toBe(false);
    expect(shouldClearMismatchOnlyAfterBulkReview("PENDING")).toBe(false);
  });

  it("상세 화면에서 돌아올 검토 완료 목록 상태를 복원한다", () => {
    const filters = initialFiltersFromRoute({
      work: "DONE",
      status: "FAIL",
      view: "single",
      q: "윤하연",
      genders: "FEMALE,MALE,UNKNOWN",
      age: "gte:25",
      height: "lte:180",
      mismatch: "1",
    });

    expect(filters.work).toBe("DONE");
    expect(filters.status).toBe("FAIL");
    expect(filters.view).toBe("single");
    expect(filters.query).toBe("윤하연");
    expect(filters.genders).toEqual(new Set(["FEMALE", "MALE"]));
    expect(filters.numeric.age).toEqual({ op: "gte", value: 25 });
    expect(filters.numeric.height).toEqual({ op: "lte", value: 180 });
    expect(filters.mismatchOnly).toBe(true);
  });

  it("잘못된 목록 상태는 검토 대기 카드 보기로 보정한다", () => {
    const filters = initialFiltersFromRoute({ work: "UNKNOWN", status: "FAIL", view: "grid" });

    expect(filters.work).toBe("PENDING");
    expect(filters.status).toBe("ALL");
    expect(filters.view).toBe("card");
  });
});

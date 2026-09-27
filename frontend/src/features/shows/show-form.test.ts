import { describe, expect, it } from "vitest";
import { validateShowField, validateShowForm, type ShowFormValues } from "./show-form";

const valid: ShowFormValues = {
  posterUrl: "https://cdn.example.test/poster.jpg",
  title: "달빛 아래 소극장",
  genre: "MUSICAL",
  runningMinutes: "100",
  inquiryPhone: "02-123-4567",
  venueName: "대학로 예술인 소극장",
  roadAddress: "서울특별시 종로구 대학로 12",
};

const empty: ShowFormValues = {
  posterUrl: "",
  title: " ",
  genre: null,
  runningMinutes: "",
  inquiryPhone: "",
  venueName: "",
  roadAddress: "",
};

describe("show form validation", () => {
  it("올바른 입력은 오류가 없다", () => {
    expect(validateShowForm(valid)).toEqual({});
  });

  it("비어 있는 필수 항목을 한 번에 모두 알려 준다", () => {
    expect(Object.keys(validateShowForm(empty))).toEqual(["poster", "title", "genre", "runningMinutes", "inquiryPhone", "venue"]);
  });

  it("공연 시간은 1~1440분 정수만 통과한다", () => {
    expect(validateShowField("runningMinutes", { ...valid, runningMinutes: "0" })).not.toBeNull();
    expect(validateShowField("runningMinutes", { ...valid, runningMinutes: "1441" })).not.toBeNull();
    expect(validateShowField("runningMinutes", { ...valid, runningMinutes: "90.5" })).not.toBeNull();
    expect(validateShowField("runningMinutes", { ...valid, runningMinutes: "1440" })).toBeNull();
  });

  it("문의 전화는 서버와 같은 하이픈 형식만 통과한다", () => {
    expect(validateShowField("inquiryPhone", { ...valid, inquiryPhone: "021234567" })).not.toBeNull();
    expect(validateShowField("inquiryPhone", { ...valid, inquiryPhone: "010-2345-6789" })).toBeNull();
    expect(validateShowField("inquiryPhone", { ...valid, inquiryPhone: "1588-1234" })).toBeNull();
  });

  it("장소는 장소명과 도로명주소를 나눠 안내한다", () => {
    expect(validateShowField("venue", { ...valid, venueName: "" })).toBe("공연 장소명을 입력해 주세요.");
    expect(validateShowField("venue", { ...valid, roadAddress: "" })).toBe("주소 검색으로 공연장 주소를 입력해 주세요.");
  });
});

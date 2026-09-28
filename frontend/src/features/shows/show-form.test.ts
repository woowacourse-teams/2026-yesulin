import { describe, expect, it } from "vitest";
import {
  normalizeShowLinkUrl,
  showLinkError,
  validateShowField,
  validateShowForm,
  type ShowFormValues,
} from "./show-form";

const valid: ShowFormValues = {
  posterUrl: "https://cdn.example.test/poster.jpg",
  title: "달빛 아래 소극장",
  genre: "MUSICAL",
  runningMinutes: "100",
  inquiryPhone: "02-123-4567",
  venueName: "대학로 예술인 소극장",
  roadAddress: "서울특별시 종로구 대학로 12",
  links: [{ label: "공연사 인스타그램 보기", url: "https://instagram.com/yesulin" }],
};

const empty: ShowFormValues = {
  posterUrl: "",
  title: " ",
  genre: null,
  runningMinutes: "",
  inquiryPhone: "",
  venueName: "",
  roadAddress: "",
  links: [{ label: "", url: "" }],
};

describe("show form validation", () => {
  it("올바른 입력은 오류가 없다", () => {
    expect(validateShowForm(valid)).toEqual({});
  });

  it("비어 있는 필수 항목을 한 번에 모두 알려 준다", () => {
    expect(Object.keys(validateShowForm(empty))).toEqual(["poster", "title", "genre", "runningMinutes", "inquiryPhone", "venue", "links"]);
  });

  it("안내 링크는 버튼 이름과 http/https 주소가 모두 있어야 하고 몇 번째 링크인지 알려 준다", () => {
    expect(validateShowField("links", { ...valid, links: [] })).toBeNull();
    expect(validateShowField("links", { ...valid, links: [...valid.links, { label: "홈페이지", url: "ftp://yesulin.art" }] }))
      .toBe("안내 링크 2: https://로 시작하는 올바른 주소를 입력해 주세요.");
    expect(showLinkError({ label: " ", url: "https://yesulin.art" })).toBe("버튼 이름을 입력해 주세요.");
    expect(showLinkError({ label: "가".repeat(31), url: "https://yesulin.art" })).not.toBeNull();
    for (const url of ["instagram.com/yesulin", "https://instagram", "javascript:alert(1)", "https://yesulin .art"]) {
      expect(showLinkError({ label: "링크", url })).not.toBeNull();
    }
    expect(showLinkError({ label: "링크", url: "http://yesulin.art/about?tab=1" })).toBeNull();
  });

  it("scheme 없이 붙여넣은 주소에 https://를 붙이고 올바르지 않은 주소는 그대로 둔다", () => {
    expect(normalizeShowLinkUrl(" instagram.com/yesulin ")).toBe("https://instagram.com/yesulin");
    expect(normalizeShowLinkUrl("https://yesulin.art/공연")).toBe("https://yesulin.art/%EA%B3%B5%EC%97%B0");
    expect(normalizeShowLinkUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(normalizeShowLinkUrl("인스타")).toBe("인스타");
    expect(normalizeShowLinkUrl("")).toBe("");
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

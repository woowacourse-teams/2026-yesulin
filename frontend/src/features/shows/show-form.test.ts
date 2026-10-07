import { describe, expect, it } from "vitest";
import {
  externalReservationUrlError,
  formatInquiryPhone,
  normalizeShowLinkUrl,
  showGuideError,
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
  guides: [{ title: "주차 안내", content: "건물 지하 주차장을 이용해 주세요." }],
  links: [{ label: "공연사 인스타그램 보기", url: "https://instagram.com/yesulin" }],
  adminShow: false,
  hostName: "",
  externalReservationUrl: "",
};

const empty: ShowFormValues = {
  posterUrl: "",
  title: " ",
  genre: null,
  runningMinutes: "",
  inquiryPhone: "",
  venueName: "",
  roadAddress: "",
  guides: [{ title: "", content: "" }],
  links: [{ label: "", url: "" }],
  adminShow: false,
  hostName: "",
  externalReservationUrl: "",
};

describe("show form validation", () => {
  it("문의 전화는 지역번호·휴대폰·대표번호에 맞춰 하이픈을 넣는다", () => {
    expect(formatInquiryPhone("021234567")).toBe("02-123-4567");
    expect(formatInquiryPhone("01023456789")).toBe("010-2345-6789");
    expect(formatInquiryPhone("15881234")).toBe("1588-1234");
    expect(formatInquiryPhone("02-123-4567")).toBe("02-123-4567");
  });

  it("올바른 입력은 오류가 없다", () => {
    expect(validateShowForm(valid)).toEqual({});
  });

  it("비어 있는 필수 항목을 한 번에 모두 알려 준다", () => {
    expect(Object.keys(validateShowForm(empty))).toEqual(["poster", "title", "genre", "runningMinutes", "inquiryPhone", "venue", "guides", "links"]);
  });

  it("운영자 공연은 주최 이름과 외부 예매 링크가 필수이고, 기획사 공연은 둘 다 검사하지 않는다", () => {
    expect(Object.keys(validateShowForm({ ...valid, adminShow: true }))).toEqual(["hostName", "externalReservationUrl"]);
    expect(validateShowForm({
      ...valid, adminShow: true, hostName: "서울숲 거리극 모임", externalReservationUrl: "https://form.naver.com/response/abc123",
    })).toEqual({});
    expect(validateShowField("externalReservationUrl", { ...valid, externalReservationUrl: "아무 값" })).toBeNull();
  });

  it("외부 예매 링크는 http/https 주소여야 한다", () => {
    expect(externalReservationUrlError(" ")).toBe("관객이 예매할 외부 페이지 주소를 입력해 주세요.");
    expect(externalReservationUrlError("https://form.naver.com/response/abc123")).toBeNull();
    for (const url of ["form.naver.com/response", "https://naver", "javascript:alert(1)", `https://${"a".repeat(495)}.com`]) {
      expect(externalReservationUrlError(url)).not.toBeNull();
    }
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

  it("추가 안내는 제목과 내용이 모두 있어야 하고 몇 번째 안내인지 알려 준다", () => {
    expect(validateShowField("guides", { ...valid, guides: [] })).toBeNull();
    expect(validateShowField("guides", { ...valid, guides: [...valid.guides, { title: "관람 안내", content: " " }] }))
      .toBe("추가 안내 2: 안내 내용을 입력해 주세요.");
    expect(showGuideError({ title: " ", content: "내용" })).toBe("안내 제목을 입력해 주세요.");
    expect(showGuideError({ title: "가".repeat(31), content: "내용" })).not.toBeNull();
    expect(showGuideError({ title: "주차 안내", content: "가".repeat(1001) })).not.toBeNull();
    expect(showGuideError({ title: "가".repeat(30), content: "가".repeat(1000) })).toBeNull();
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

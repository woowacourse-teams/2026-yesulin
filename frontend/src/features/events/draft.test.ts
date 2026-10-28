import { describe, expect, it } from "vitest";
import { bannerRatioWarning, emptyEventDraft, eventDraftProblem, writeOfEvent } from "./draft";
import { formatEventPeriod } from "./types";

describe("이벤트 폼", () => {
  it("신청 전 팝업은 켰을 때 내용을 요구하고 끄면 저장할 내용을 비운다", () => {
    const draft = { ...emptyEventDraft(), title: "행사", body: "소개", registrationEnabled: true, registrationConfirmationEnabled: true };
    expect(eventDraftProblem(draft)).toContain("팝업");
    expect(eventDraftProblem({ ...draft, registrationConfirmationMessage: "가".repeat(2001) })).toContain("2000자");
    const ready = { ...draft, registrationConfirmationMessage: " 안내\n둘째 줄 " };
    expect(eventDraftProblem(ready)).toBeNull();
    expect(writeOfEvent(ready).registrationConfirmationMessage).toBe("안내\n둘째 줄");
    expect(writeOfEvent({ ...ready, registrationConfirmationEnabled: false }).registrationConfirmationMessage).toBeNull();
    const disabled = writeOfEvent({ ...ready, registrationEnabled: false });
    expect(disabled.registrationConfirmationEnabled).toBe(false);
    expect(disabled.registrationConfirmationMessage).toBeNull();
  });

  it("빈 칸은 null로 바꾸고 앞뒤 공백을 지운다", () => {
    const write = writeOfEvent({ ...emptyEventDraft(), title: " 1기 서포터즈 ", body: " 본문\n둘째 줄 ", summary: " ", bannerOrder: "3" });

    expect(write.title).toBe("1기 서포터즈");
    expect(write.body).toBe("본문\n둘째 줄");
    expect(write.summary).toBeNull();
    expect(write.startsOn).toBeNull();
    expect(write.banner).toEqual({ enabled: false, desktopImageUrl: null, mobileImageUrl: null, alt: null, endsOn: null, order: 3 });
  });

  it("필수 칸, 기간, 링크, 배너 조건을 먼저 알려 준다", () => {
    const ready = { ...emptyEventDraft(), title: "제목", body: "본문" };

    expect(eventDraftProblem(ready)).toBeNull();
    expect(eventDraftProblem({ ...ready, title: " " })).toContain("제목");
    expect(eventDraftProblem({ ...ready, startsOn: "2026-10-16", endsOn: "2026-10-01" })).toContain("종료일");
    expect(eventDraftProblem({ ...ready, applyUrl: "forms.gle/abc" })).toContain("신청 링크");
    expect(eventDraftProblem({ ...ready, bannerEnabled: true, bannerDesktopImageUrl: "/d.webp" })).toContain("배너");
    expect(eventDraftProblem({ ...ready, bannerOrder: "100" })).toContain("순서");
  });
});

describe("이벤트 개요와 하단 상세", () => {
  it("개요와 상세 설명, 이미지 순서를 독립적으로 저장한다", () => {
    const write = writeOfEvent({ ...emptyEventDraft(), title: "이벤트", body: " 개요 ", detailBody: " 상세\n설명 ", detailImageUrls: ["/second.webp", "/first.webp"] });
    expect(write.body).toBe("개요");
    expect(write.detailBody).toBe("상세\n설명");
    expect(write.detailImageUrls).toEqual(["/second.webp", "/first.webp"]);
    expect(writeOfEvent(emptyEventDraft()).detailBody).toBeNull();
    expect(writeOfEvent(emptyEventDraft()).detailImageUrls).toEqual([]);
  });

  it("설명 없이 이미지만 등록할 수 있고 중복·개수·길이를 확인한다", () => {
    const draft = { ...emptyEventDraft(), title: "이벤트", body: "개요", detailImageUrls: ["/one.webp"] };
    expect(eventDraftProblem(draft)).toBeNull();
    expect(eventDraftProblem({ ...draft, detailImageUrls: ["/one.webp", "/one.webp"] })).toContain("중복");
    expect(eventDraftProblem({ ...draft, detailImageUrls: Array.from({ length: 11 }, (_, i) => `/${i}.webp`) })).toContain("10장");
    expect(eventDraftProblem({ ...draft, detailBody: "가".repeat(5001) })).toContain("5000자");
  });
});

describe("배너 비율 안내", () => {
  it("칸 비율과 10% 안쪽이면 안내하지 않는다", () => {
    expect(bannerRatioWarning("bannerDesktop", 2172, 724)).toBeNull();
    expect(bannerRatioWarning("bannerMobile", 1448, 1086)).toBeNull();
  });

  it("크게 다르면 실제 크기와 맞출 비율을 알려 준다", () => {
    expect(bannerRatioWarning("bannerDesktop", 1080, 1080)).toContain("3.2:1");
    expect(bannerRatioWarning("bannerMobile", 2172, 724)).toContain("4:3");
  });
});

describe("이벤트 기간 표시", () => {
  it("같은 해면 끝 날짜에서 해를 줄이고, 한쪽만 있으면 부터·까지로 쓴다", () => {
    expect(formatEventPeriod("2026-10-01", "2026-10-16")).toBe("2026.10.01 ~ 10.16");
    expect(formatEventPeriod("2026-12-20", "2027-01-10")).toBe("2026.12.20 ~ 2027.01.10");
    expect(formatEventPeriod(null, "2026-10-16")).toBe("2026.10.16까지");
    expect(formatEventPeriod(null, null)).toBeNull();
  });
});


describe("이벤트 합산 총정원", () => {
  it("빈 정원은 제한이 없고 1명 이상의 정수만 저장한다", () => {
    const ready = { ...emptyEventDraft(), title: "선착순 행사", body: "안내", registrationEnabled: true };
    expect(writeOfEvent(ready).registrationCapacity).toBeNull();
    for (const value of ["0", "-1", "1.5", "2147483648", "abc"]) {
      expect(eventDraftProblem({ ...ready, registrationCapacity: value })).toContain("정원");
    }
    expect(eventDraftProblem({ ...ready, registrationCapacity: "30" })).toBeNull();
    expect(writeOfEvent({ ...ready, registrationCapacity: "30" }).registrationCapacity).toBe(30);
  });
});

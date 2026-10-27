import { describe, expect, it } from "vitest";
import {
  careerYears,
  emptyCareer,
  emptyRegistrationDraft,
  formatPhoneInput,
  registrationProblem,
  toggleActivityField,
  writeOfRegistration,
  type RegistrationDraft,
} from "./registration-draft";
import { EVENT_ACTIVITY_FIELDS } from "./types";

const TODAY = "2026-10-26";

const cardActor: RegistrationDraft = {
  ...emptyRegistrationDraft(),
  participantType: "ACTOR",
  name: " 김하늘 ",
  phone: "01012345678",
  affiliation: "남극장",
  businessCardRequested: true,
  email: " haneul@test.com ",
  snsHandle: " ",
  birthDate: "2001-03-14",
  photoUploadKey: "upload-key",
  activityFields: ["THEATER", "OTHER"],
  otherActivity: " 성우 ",
  careers: [
    { key: 1, year: "2025", month: "09", workTitle: " 연극 <달빛 정거장> ", role: " 민수 역 " },
    emptyCareer(2),
  ],
  privacyAgreed: true,
};

const plainActor: RegistrationDraft = { ...cardActor, businessCardRequested: false, photoUploadKey: null, email: "" };

const producer: RegistrationDraft = {
  ...cardActor,
  participantType: "PRODUCER",
  businessCardRequested: false,
  affiliation: " 남극장 · 캐스팅 담당 ",
};

describe("참가 신청서", () => {
  it("휴대폰 번호에 하이픈을 넣는다", () => {
    expect(formatPhoneInput("01012345678")).toBe("010-1234-5678");
    expect(formatPhoneInput("010-123-4567")).toBe("010-123-4567");
    expect(formatPhoneInput("0101")).toBe("010-1");
  });

  it("분야는 고른 순서와 상관없이 정해진 순서로 둔다", () => {
    const fields = toggleActivityField(toggleActivityField([], "YOUTUBE", EVENT_ACTIVITY_FIELDS), "THEATER", EVENT_ACTIVITY_FIELDS);
    expect(fields).toEqual(["THEATER", "YOUTUBE"]);
    expect(toggleActivityField(fields, "THEATER", EVENT_ACTIVITY_FIELDS)).toEqual(["YOUTUBE"]);
  });

  it("경력 연도는 올해부터 1970년까지 거꾸로 고른다", () => {
    const years = careerYears(TODAY);
    expect(years[0]).toBe("2026");
    expect(years.at(-1)).toBe("1970");
  });

  it("명함을 희망한 배우는 명함 정보를 모두 보낸다", () => {
    expect(registrationProblem(cardActor, TODAY)).toBeNull();
    expect(writeOfRegistration(cardActor)).toEqual({
      participantType: "ACTOR",
      name: "김하늘",
      phone: "010-1234-5678",
      affiliation: null,
      businessCardRequested: true,
      email: "haneul@test.com",
      snsHandle: null,
      birthDate: "2001-03-14",
      photoUploadKey: "upload-key",
      activityFields: ["THEATER", "OTHER"],
      otherActivity: "성우",
      noCareer: false,
      careers: [{ performedMonth: "2025-09", workTitle: "연극 <달빛 정거장>", role: "민수 역" }],
      intro: null,
      privacyAgreed: true,
    });
  });

  it("명함을 원하지 않는 배우와 공연사 관계자는 명함 정보를 보내지 않는다", () => {
    expect(registrationProblem(plainActor, TODAY)).toBeNull();
    expect(writeOfRegistration({ ...plainActor, photoUploadKey: "upload-key" })).toMatchObject({
      businessCardRequested: false,
      email: null,
      birthDate: null,
      photoUploadKey: null,
      activityFields: [],
      careers: [],
      affiliation: null,
    });

    expect(registrationProblem(producer, TODAY)).toBeNull();
    expect(writeOfRegistration({ ...producer, businessCardRequested: true })).toMatchObject({
      affiliation: "남극장 · 캐스팅 담당",
      businessCardRequested: false,
      email: null,
      photoUploadKey: null,
    });
  });

  it("한 줄 소개는 명함을 희망한 배우만 보낸다", () => {
    expect(writeOfRegistration({ ...cardActor, intro: " 노래로 이야기를 전하는 배우 " }).intro).toBe("노래로 이야기를 전하는 배우");
    expect(writeOfRegistration({ ...cardActor, intro: " " }).intro).toBeNull();
    expect(writeOfRegistration({ ...plainActor, intro: "소개" }).intro).toBeNull();
  });

  it("경력 없음을 체크하면 적은 경력을 보내지 않는다", () => {
    const newcomer = { ...cardActor, noCareer: true };
    expect(registrationProblem(newcomer, TODAY)).toBeNull();
    expect(writeOfRegistration(newcomer)).toMatchObject({ noCareer: true, careers: [] });
  });

  it("빠진 칸을 먼저 알려 준다", () => {
    expect(registrationProblem(emptyRegistrationDraft(), TODAY)).toContain("참가 구분");
    expect(registrationProblem({ ...cardActor, phone: "02-123-4567" }, TODAY)).toContain("휴대폰");
    expect(registrationProblem({ ...cardActor, email: "haneul" }, TODAY)).toContain("이메일");
    expect(registrationProblem({ ...cardActor, birthDate: "" }, TODAY)).toContain("생년월일");
    expect(registrationProblem({ ...cardActor, birthDate: "2026-10-27" }, TODAY)).toContain("생년월일");
    expect(registrationProblem({ ...cardActor, photoUploadKey: null }, TODAY)).toContain("사진");
    expect(registrationProblem({ ...cardActor, activityFields: [] }, TODAY)).toContain("활동 분야");
    expect(registrationProblem({ ...cardActor, otherActivity: " " }, TODAY)).toContain("기타");
    expect(registrationProblem({ ...cardActor, careers: [emptyCareer(1)] }, TODAY)).toContain("경력 없음");
    expect(registrationProblem({ ...cardActor, careers: [{ key: 1, year: "2025", month: "", workTitle: "작품", role: "" }] }, TODAY)).toContain("연도와 월");
    expect(registrationProblem({ ...cardActor, careers: [{ key: 1, year: "2025", month: "09", workTitle: " ", role: "역" }] }, TODAY)).toContain("작품명");
    expect(registrationProblem({ ...producer, affiliation: " " }, TODAY)).toContain("소속");
    expect(registrationProblem({ ...cardActor, privacyAgreed: false }, TODAY)).toContain("동의");
  });
});

import { describe, expect, it } from "vitest";
import {
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

const actor: RegistrationDraft = {
  ...emptyRegistrationDraft(),
  participantType: "ACTOR",
  name: " 김하늘 ",
  phone: "01012345678",
  email: " haneul@test.com ",
  snsHandle: " ",
  birthDate: "2001-03-14",
  affiliation: "남극장",
  photoUploadKey: "upload-key",
  activityFields: ["THEATER", "OTHER"],
  otherActivity: " 성우 ",
  careers: [
    { key: 1, performedMonth: "2025-09", workTitle: " 연극 <달빛 정거장> ", role: " 민수 역 " },
    emptyCareer(2),
  ],
  privacyAgreed: true,
};

const producer: RegistrationDraft = {
  ...actor,
  participantType: "PRODUCER",
  birthDate: "",
  photoUploadKey: null,
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

  it("배우는 분야·경력·사진을, 공연사 관계자는 소속만 보낸다", () => {
    expect(registrationProblem(actor, TODAY)).toBeNull();
    expect(writeOfRegistration(actor)).toEqual({
      participantType: "ACTOR",
      name: "김하늘",
      phone: "010-1234-5678",
      email: "haneul@test.com",
      snsHandle: null,
      birthDate: "2001-03-14",
      affiliation: null,
      photoUploadKey: "upload-key",
      activityFields: ["THEATER", "OTHER"],
      otherActivity: "성우",
      noCareer: false,
      careers: [{ performedMonth: "2025-09", workTitle: "연극 <달빛 정거장>", role: "민수 역" }],
      privacyAgreed: true,
    });

    expect(registrationProblem(producer, TODAY)).toBeNull();
    const write = writeOfRegistration({ ...producer, birthDate: "2001-03-14", photoUploadKey: "upload-key" });
    expect(write.affiliation).toBe("남극장 · 캐스팅 담당");
    expect(write.birthDate).toBeNull();
    expect(write.photoUploadKey).toBeNull();
    expect(write.activityFields).toEqual([]);
    expect(write.careers).toEqual([]);
  });

  it("경력 없음을 체크하면 적은 경력을 보내지 않는다", () => {
    const newcomer = { ...actor, noCareer: true };
    expect(registrationProblem(newcomer, TODAY)).toBeNull();
    expect(writeOfRegistration(newcomer)).toMatchObject({ noCareer: true, careers: [] });
  });

  it("빠진 칸을 먼저 알려 준다", () => {
    expect(registrationProblem(emptyRegistrationDraft(), TODAY)).toContain("참가 구분");
    expect(registrationProblem({ ...actor, phone: "02-123-4567" }, TODAY)).toContain("휴대폰");
    expect(registrationProblem({ ...actor, email: "haneul" }, TODAY)).toContain("이메일");
    expect(registrationProblem({ ...actor, birthDate: "2026-10-27" }, TODAY)).toContain("생년월일");
    expect(registrationProblem({ ...actor, photoUploadKey: null }, TODAY)).toContain("사진");
    expect(registrationProblem({ ...actor, activityFields: [] }, TODAY)).toContain("활동 분야");
    expect(registrationProblem({ ...actor, otherActivity: " " }, TODAY)).toContain("기타");
    expect(registrationProblem({ ...actor, careers: [emptyCareer(1)] }, TODAY)).toContain("경력 없음");
    expect(registrationProblem({ ...actor, careers: [{ key: 1, performedMonth: "", workTitle: "작품", role: "" }] }, TODAY)).toContain("시기");
    expect(registrationProblem({ ...actor, careers: [{ key: 1, performedMonth: "2025-09", workTitle: " ", role: "역" }] }, TODAY)).toContain("작품명");
    expect(registrationProblem({ ...producer, affiliation: " " }, TODAY)).toContain("소속");
    expect(registrationProblem({ ...actor, privacyAgreed: false }, TODAY)).toContain("동의");
  });
});

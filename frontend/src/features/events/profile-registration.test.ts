import { describe, expect, it } from "vitest";
import { prefillEventRegistration, snsFromProfileLink } from "./profile-registration";
import { emptyRegistrationDraft } from "./registration-draft";
import type { ApplicantProfileResponse } from "@/features/applicants/types";

const profile: ApplicantProfileResponse = {
  answers: [
    { key: "NAME", label: "이름", value: "김배우" }, { key: "PHONE", label: "연락처", value: "01012345678" },
    { key: "EMAIL", label: "이메일", value: "actor@example.com" }, { key: "BIRTH", label: "생년월일", value: "2000-03-14" },
    { key: "CAREER", label: "경력", value: [{ year: 2025, title: "공연", part: "주연" }] },
    { key: "LINK", label: "링크", value: ["https://instagram.com/my.actor/"] },
  ], photoLibrary: [], videoLibrary: [], completeness: { filled: 4, standardTotal: 8 },
};
describe("명함 신청서 프로필 미리 채움", () => {
  it("공통 정보는 가져오고 경력 월·분야·개인정보 동의는 사용자가 확인한다", () => {
    const result = prefillEventRegistration(emptyRegistrationDraft(), profile);
    expect(result).toMatchObject({ participantType: "ACTOR", businessCardRequested: true, name: "김배우", phone: "010-1234-5678", email: "actor@example.com", birthDate: "2000-03-14", snsPlatform: "INSTAGRAM", snsHandle: "my.actor", privacyAgreed: false, activityFields: [] });
    expect(result.careers[0]).toMatchObject({ year: "2025", month: "", workTitle: "공연", role: "주연" });
    expect(result.photoUploadKey).toBeNull();
  });
  it("명함용 수정 내용과 경력 없음 선택을 덮어쓰지 않는다", () => {
    const draft = { ...emptyRegistrationDraft(), name: "예명", email: "card@example.com", noCareer: true, photoUploadKey: "existing-photo" };
    const result = prefillEventRegistration(draft, profile);
    expect(result.name).toBe("예명"); expect(result.email).toBe("card@example.com");
    expect(result.noCareer).toBe(true); expect(result.careers).toEqual(draft.careers); expect(result.photoUploadKey).toBe("existing-photo");
    expect(profile.answers[0].value).toBe("김배우");
  });
  it("경력이 비어 있다는 이유만으로 신입을 선택하지 않는다", () => {
    expect(prefillEventRegistration(emptyRegistrationDraft(), { ...profile, answers: [] }).noCareer).toBe(false);
  });
  it("SNS 프로필 주소만 계정명으로 바꾸며 게시물·영상·유사 도메인은 추측하지 않는다", () => {
    expect(snsFromProfileLink("https://threads.com/@actor")).toEqual({ snsPlatform: "THREADS", snsHandle: "actor" });
    expect(snsFromProfileLink("https://youtube.com/@actor")).toEqual({ snsPlatform: "YOUTUBE", snsHandle: "@actor" });
    for (const link of ["https://instagram.com/p/abc", "https://instagram.com.evil.test/actor", "https://youtube.com/watch?v=abc", "javascript:alert(1)", `https://instagram.com/${"a".repeat(21)}`]) expect(snsFromProfileLink(link)).toBeNull();
  });
});

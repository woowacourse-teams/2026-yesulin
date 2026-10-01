import { describe, expect, it } from "vitest";
import { completeAppointment, needsNoticeRefresh, noticeInstructions, noticeTemplate, renderNoticeBody } from "./notice-message";

describe("문자 작성과 결과 확인", () => {
  it("미완성 일시는 서버로 보내지 않고 완성된 일시만 확인한다", () => {
    for (const value of [null, "", "2026-10-01T:00", "T14:00", "2026-10-01T14:"]) expect(completeAppointment(value)).toBe(false);
    expect(completeAppointment("2026-10-01T14:00")).toBe(true);
  });
  it("서버 header·footer와 개인 일시를 입력 즉시 미리보기에 반영한다", () => {
    const header = "안녕하세요, 예술인 로컬 제작사입니다.\n{이름}님께서 '호경 테스트' 오디션 대상자로 선정되셨습니다.";
    const body = renderNoticeBody(noticeTemplate("장소: 대학로 OO극장\n자유연기 1분을 준비해주세요."), "심호경", "2026-10-20T07:00", header, "문의: 010-1234-5678");
    expect(body).toBe("안녕하세요, 예술인 로컬 제작사입니다.\n심호경님께서 '호경 테스트' 오디션 대상자로 선정되셨습니다.\n\n오디션 일시: 2026-10-20 07:00\n\n장소: 대학로 OO극장\n자유연기 1분을 준비해주세요.\n\n문의: 010-1234-5678");
  });
  it("추가 안내사항을 비워도 이름과 일시를 한 번씩 포함한다", () => {
    const header = "안녕하세요, 제작사입니다.\n{이름}님께서 '공고' 오디션 대상자로 선정되셨습니다.";
    for (const instructions of ["", "   \n  "]) {
      const template = noticeTemplate(instructions);
      expect(noticeInstructions(template)).toBe("");
      const body = renderNoticeBody(template, "하린", "2026-10-20T07:00", header, "문의: 01000000000");
      expect(body).toBe("안녕하세요, 제작사입니다.\n하린님께서 '공고' 오디션 대상자로 선정되셨습니다.\n\n오디션 일시: 2026-10-20 07:00\n\n문의: 01000000000");
    }
  });
  it("추가 안내사항과 기존 자유 형식 초안을 손실 없이 구분한다", () => {
    const instructions = "자유연기 1분\n장소: 연습실";
    expect(noticeInstructions(noticeTemplate(instructions))).toBe(instructions);
    expect(noticeInstructions("{이름}님 {오디션일시}에 만나요")).toBeNull();
    expect(noticeInstructions(noticeTemplate("장소는 "))).toBe("장소는 ");
  });
  it("확정 결과는 조회를 멈추고 조회 가능한 미확정 결과만 갱신한다", () => {
    for (const status of ["QUEUED", "SENDING", "ACCEPTED", "UNKNOWN"]) {
      expect(needsNoticeRefresh([{ status, providerId: "solapi:M1" }])).toBe(true);
    }
    for (const status of ["DELIVERED", "FAILED", "UNKNOWN"]) {
      expect(needsNoticeRefresh([{ status, providerId: null }])).toBe(false);
    }
  });
});

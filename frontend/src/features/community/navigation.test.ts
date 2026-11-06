import { expect, it } from "vitest";
import { authSuccessReturnTo, safeAuthReturnTo } from "@/features/auth/return-to";
import { communityCommentEditReturnTo, communityReturnTo } from "./navigation";

it("댓글 로그인 복귀 경로가 기존 안전한 복귀 검증을 통과한다", () => {
  const path = communityReturnTo(3);
  expect(safeAuthReturnTo(path)).toBe("/community/3?reply=1");
  expect(authSuccessReturnTo(path)).toBe(path);
});
it("댓글 수정 복귀는 원래 댓글을 지정하고 안전한 경로 검증을 통과한다", () => {
  expect(authSuccessReturnTo(communityCommentEditReturnTo(3, 27))).toBe("/community/3?editComment=27");
});
it("수정 복귀는 해당 글의 수정 화면이며 새 글과 구분한다", () => {
  expect(authSuccessReturnTo(communityReturnTo(7, true))).toBe("/community/7?edit=1");
  expect(communityReturnTo()).toBe("/community/new");
});

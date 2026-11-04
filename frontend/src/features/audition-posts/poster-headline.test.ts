import { describe, expect, it } from "vitest";
import { posterHeadline } from "./poster-headline";

describe("기본 포스터 작품명", () => {
  it.each([
    ["블랙코미디 연극 <죽여주는 이야기> 2026년 4차 배우 모집 (~10.28)", "죽여주는 이야기"],
    ["2027 창작 음악극 《한 사람》 캐스팅 오디션", "한 사람"],
    ["가족뮤지컬 \"눈의여왕\" 배우 오디션 공고", "눈의여왕"],
    ["###어린왕자와 산타의 결합 <어린산타> 전 배역모집######3", "어린산타"],
    ["창작극 [사로] 배우모집 (수정)", "사로"],
  ])("%s에서 작품명을 꺼낸다", (title, expected) => {
    expect(posterHeadline(title)).toBe(expected);
  });

  it("모집 안내 대괄호는 작품명으로 쓰지 않는다", () => {
    expect(posterHeadline("[긴급모집] 행사 여성 배우 1명 모집")).toBe("[긴급모집] 행사 여성 배우 1명 모집");
  });

  it("작품명이 없으면 장식 문자를 지운 제목을 쓴다", () => {
    expect(posterHeadline("**극단 파동 창작진 모집**")).toBe("극단 파동 창작진 모집");
  });
});

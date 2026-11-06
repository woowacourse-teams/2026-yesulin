import { describe, expect, it } from "vitest";
import { bodyImageUrls } from "./body-images";

describe("공고 본문 원문 사진", () => {
  it("본문 사진 주소를 문서 순서대로 꺼내고 HTML 문자 참조를 푼다", () => {
    const html = '<p><img src="https://cdn.test/a.jpg" alt="포스터"></p><p>글</p><img alt="둘째" src="https://cdn.test/b.jpg?w=1&amp;h=2">';
    expect(bodyImageUrls(html)).toEqual(["https://cdn.test/a.jpg", "https://cdn.test/b.jpg?w=1&h=2"]);
  });

  it("사진이 없는 글 공고는 빈 목록이다", () => {
    expect(bodyImageUrls("<p>모집 안내</p>")).toEqual([]);
  });

  it("data-src 같은 다른 속성은 사진 주소로 보지 않는다", () => {
    expect(bodyImageUrls('<img data-src="https://cdn.test/x.jpg">')).toEqual([]);
  });

  it("alt 값 안의 src= 글자를 주소로 잘못 읽지 않는다", () => {
    expect(bodyImageUrls('<img alt="q src=" src="https://cdn.test/a.jpg"><img src="https://cdn.test/b.jpg">'))
      .toEqual(["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"]);
  });

  it("서버가 &nbsp;로 내보낸 줄바꿈 없는 공백을 DOM 값과 같게 푼다", () => {
    expect(bodyImageUrls('<img src="https://cdn.test/a&nbsp;b.jpg">')).toEqual(["https://cdn.test/a b.jpg"]);
  });
});

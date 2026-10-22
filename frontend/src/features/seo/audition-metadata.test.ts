import { describe, expect, it } from "vitest";
import type { AuditionPost } from "@/features/audition-posts/types";
import {
  auditionListMetadata,
  auditionPostDescription,
  auditionPostMetadata,
  auditionPostSearchTitle,
  AUDITION_LIST_TITLE,
  SHARE_IMAGE,
} from "./audition-metadata";

const post: AuditionPost = {
  id: 99,
  category: "뮤지컬",
  title: "%%%%가족뮤지컬 <어린산타> 전체 배우 구함%%%%%%",
  authorName: "상상발전소",
  pay: "협의",
  deadlineText: "2026-11-10",
  deadline: "2026-11-10",
  closed: false,
  viewCount: 0,
  alertChatMembers: 0,
  postedAt: "2026-10-18T00:00:00Z",
  bodyHtml: "<p>안녕하세요&nbsp;극단입니다.</p><p><img src=\"https://cdn.example.com/poster\" alt=\"poster.jpg\"></p>",
  tags: [],
  attachments: [],
  source: "OTR",
  sourceUrl: "https://example.com/original",
  updatedAt: "2026-10-18T00:00:00Z",
  company: null,
};

describe("공고 상세 검색 정보", () => {
  it("검색·공유 제목에서만 반복 기호와 지난 마감 머리말을 걷어 낸다", () => {
    expect(auditionPostSearchTitle("%%%%6만5천명이 선택한 아동극 <어린산타>전체배우구함%%%%%%")).toBe("6만5천명이 선택한 아동극 <어린산타>전체배우구함");
    expect(auditionPostSearchTitle("!!!!!!!최고 흥행작 <오즈의크리스마스> 배우구함!!!!!!!!!!!!!")).toBe("최고 흥행작 <오즈의크리스마스> 배우구함");
    expect(auditionPostSearchTitle("@@@@@ 흥행작 <오즈의 산타> 배우모집 @@@@")).toBe("흥행작 <오즈의 산타> 배우모집");
    expect(auditionPostSearchTitle("[지원마감 D-5] 2027 뮤지컬 <초록> 배우를 모집합니다.")).toBe("2027 뮤지컬 <초록> 배우를 모집합니다.");
    expect(auditionPostSearchTitle("연극 <공부의 신> 추가 오디션!!!! 급구")).toBe("연극 <공부의 신> 추가 오디션! 급구");
  });

  it("뜻이 있는 기호와 원문 표현은 남긴다", () => {
    for (const title of [
      "[급구] ★ 톡톡 라이브쇼 <헬로카봇> 성인 남자 배역 모집 (~10/21)",
      "뮤지컬 <로그아웃> 남자 배우 모집합니다!",
      "🎭 [배우 모집] 아동극 〈우당탕탕 크리스마스〉 상시 오디션 🎄",
    ]) expect(auditionPostSearchTitle(title)).toBe(title);
    expect(auditionPostSearchTitle("!!!")).toBe("!!!");
  });

  it("설명문은 분야·작성자·페이·마감 뒤에 글로 쓴 본문 앞부분을 붙인다", () => {
    expect(auditionPostDescription(post)).toBe("뮤지컬 오디션 · 상상발전소 · 페이 협의 · 마감 11월 10일까지. 안녕하세요 극단입니다.");
    expect(auditionPostDescription({ ...post, pay: "", bodyHtml: "<p><img src=\"https://cdn.example.com/a\"></p>" }))
      .toBe("뮤지컬 오디션 · 상상발전소 · 마감 11월 10일까지");
    const long = auditionPostDescription({ ...post, bodyHtml: `<p>${"가".repeat(200)}</p>` });
    expect(long.endsWith("…")).toBe(true);
    expect(Array.from(long.split(". ")[1])).toHaveLength(90);
  });

  it("공유 제목·이미지를 홈 값 대신 공고 값으로 채운다", () => {
    const metadata = auditionPostMetadata(post);
    expect(metadata.title).toBe("가족뮤지컬 <어린산타> 전체 배우 구함");
    expect(metadata.alternates?.canonical).toBe("/posts/99");
    expect(metadata.openGraph).toMatchObject({ type: "article", url: "/posts/99", title: metadata.title, images: [{ url: "https://cdn.example.com/poster" }] });
    expect(metadata.twitter).toMatchObject({ title: metadata.title, images: ["https://cdn.example.com/poster"] });
    expect(auditionPostMetadata({ ...post, bodyHtml: "<p>사진 없음</p>" }).openGraph).toMatchObject({ images: [SHARE_IMAGE] });
  });
});

describe("공고 목록 검색 정보", () => {
  it("분야·페이지·마감 조건이 다른 문서에 각각 canonical과 제목을 제공한다", () => {
    const home = auditionListMetadata({ page: 0, includeClosed: false });
    expect(home.title).toEqual({ absolute: AUDITION_LIST_TITLE });
    expect(home.alternates?.canonical).toBe("/auditions");
    const category = auditionListMetadata({ category: "연극", page: 1, includeClosed: true });
    expect(category.title).toBe("연극 오디션 공고 · 마감 포함 · 2페이지");
    expect(category.alternates?.canonical).toBe("/auditions/theater?closed=1&page=2");
    expect(category.alternates?.types).toEqual({ "application/rss+xml": "/rss.xml" });
    expect(category.openGraph).toMatchObject({ title: "연극 오디션 공고 · 마감 포함 · 2페이지 | 예술in" });
    expect(category.twitter).toMatchObject({ title: "연극 오디션 공고 · 마감 포함 · 2페이지 | 예술in" });
  });

  it("레이아웃의 openGraph·twitter를 대체해도 공유 이미지를 유지한다", () => {
    for (const metadata of [
      auditionListMetadata({ page: 0, includeClosed: false }),
      auditionListMetadata({ category: "뮤지컬", page: 0, includeClosed: false }),
    ]) {
      expect(metadata.openGraph).toMatchObject({ images: [SHARE_IMAGE] });
      expect(metadata.twitter).toMatchObject({ images: [SHARE_IMAGE.url] });
    }
  });
});

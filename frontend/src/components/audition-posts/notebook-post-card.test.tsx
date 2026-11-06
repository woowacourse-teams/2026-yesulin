import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AuditionPostSummary } from "@/features/audition-posts/types";
import { NotebookPostCard } from "./notebook-post-card";

const post: AuditionPostSummary = {
  id: 1, category: "연극", title: "봄의 정원", authorName: "다음장면 프로젝트",
  pay: "협의", deadlineText: "상시", deadline: null, closed: false, viewCount: 0,
  postedAt: null, alertChatMembers: 0, thumbnailUrl: null, attachmentCount: 0,
};

function render(rank?: number) {
  return renderToStaticMarkup(<ul><NotebookPostCard post={post} today="2026-11-06" now={0} rank={rank} /></ul>);
}

describe("공고 포스터 카드", () => {
  it("순위가 없는 기본 포스터는 왼쪽 아래에 단체 이름을 쓴다", () => {
    expect(render()).toContain('class="notebook-poster-mark"');
  });

  it("순위 숫자와 겹치지 않도록 순위 카드의 기본 포스터는 단체 이름을 빼고 byline에만 남긴다", () => {
    const html = render(1);
    expect(html).toContain('aria-label="1위"');
    expect(html).not.toContain("notebook-poster-mark");
    expect(html).toContain("연극 · 다음장면 프로젝트");
  });
});

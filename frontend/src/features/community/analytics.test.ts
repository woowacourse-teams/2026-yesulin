import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeProductProperties } from "@/features/analytics/posthog-contract";
import type { CommunityEntry } from "./types";

const track = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: track }));

const post: CommunityEntry = { id: 7, title: "첫 리딩", body: "비밀 본문", author: "익명1", createdAt: "", updatedAt: "", commentCount: 0, editable: true, likeCount: 0, liked: false };

beforeEach(() => track.mockClear());

describe("익명게시판 이벤트", () => {
  it("글·댓글 번호와 본문 없이 행동만 보낸다", async () => {
    const analytics = await import("./analytics");
    analytics.trackListViewed();
    analytics.trackPostViewed();
    analytics.trackComposeStarted();
    analytics.trackPostCreated();
    analytics.trackCommentCreated();
    expect(track.mock.calls).toEqual([
      ["community_list_viewed"], ["community_post_viewed"], ["community_compose_started"],
      ["community_post_created"], ["community_comment_created"],
    ]);
  });

  it("좋아요는 결과 상태를, 신고는 글·댓글 구분만 보낸다", async () => {
    const analytics = await import("./analytics");
    analytics.trackLikeToggled(true);
    analytics.trackReportSubmitted(post);
    analytics.trackReportSubmitted({ ...post, id: 8, title: null });
    expect(track.mock.calls).toEqual([
      ["community_like_toggled", { liked: true }],
      ["community_report_submitted", { community_target: "post" }],
      ["community_report_submitted", { community_target: "comment" }],
    ]);
  });

  it("허용 목록에 없는 본문·작성자 값은 전송 직전에 제거한다", () => {
    const leaked = { liked: false, community_target: "comment", body: "비밀 본문", author: "익명1" } as never;
    expect(safeProductProperties(leaked)).toEqual({ liked: false, community_target: "comment" });
  });
});

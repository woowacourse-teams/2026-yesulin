import { describe, expect, it } from "vitest";
import { groupNotices, noticeHeadline, noticePeriod } from "./notice-groups";
import type { CommunityNotice } from "./types";

const notice = (id: number, patch: Partial<CommunityNotice> = {}): CommunityNotice => ({
  commentId: id, postId: 1, title: "글", replyToId: null, seen: false, author: `익명${id}`, preview: "내용",
  createdAt: "2026-11-05T09:00:00Z", ...patch,
});

describe("받은 댓글 알림 묶기", () => {
  it("같은 글·같은 종류·같은 읽음 상태를 한 줄로 묶고 최신 순서를 지킨다", () => {
    const groups = groupNotices([notice(5), notice(4), notice(3, { replyToId: 9 }), notice(2, { seen: true }), notice(1, { postId: 7 })]);
    expect(groups.map((group) => group.commentIds)).toEqual([[5, 4], [3], [2], [1]]);
    expect(groups[0].latest.commentId).toBe(5);
  });

  it("같은 사람이 여러 번 써도 이름은 한 번만 센다", () => {
    const [group] = groupNotices([notice(3, { author: "익명2" }), notice(2, { author: "익명2" }), notice(1, { author: "익명4" })]);
    expect(noticeHeadline(group)).toBe("익명2 외 1명이 내 글에 댓글을 남겼어요");
  });

  it("한 사람이면 님을 붙이고 답글은 답글로 말한다", () => {
    expect(noticeHeadline({ authors: ["익명4"], kind: "reply" })).toBe("익명4님이 내 댓글에 답글을 남겼어요");
    expect(noticeHeadline({ authors: ["프로필 비공개"], kind: "comment" })).toBe("비공개 배우가 내 글에 댓글을 남겼어요");
  });

  it("비공개 작성자는 이름이 같아도 서로 다른 사람으로 센다", () => {
    const [group] = groupNotices([notice(2, { author: "프로필 비공개" }), notice(1, { author: "프로필 비공개" })]);
    expect(noticeHeadline(group)).toBe("프로필 비공개 외 1명이 내 글에 댓글을 남겼어요");
  });

  it("오늘·이번 주·이전으로 나눈다", () => {
    const now = new Date(2026, 10, 5, 15, 0);
    expect(noticePeriod(new Date(2026, 10, 5, 1, 0).toISOString(), now)).toBe("오늘");
    expect(noticePeriod(new Date(2026, 10, 1, 12, 0).toISOString(), now)).toBe("최근 7일");
    expect(noticePeriod(new Date(2026, 9, 20, 12, 0).toISOString(), now)).toBe("이전");
  });
});

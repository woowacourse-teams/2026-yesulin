import type { CommunityNotice } from "./types";

export type NoticeKind = "comment" | "reply";
export type NoticePeriod = "오늘" | "최근 7일" | "이전";

/** 같은 글에 같은 종류로 들어온 알림을 읽음 상태별로 한 줄에 묶는다. 최신 알림 순서를 유지한다. */
export type NoticeGroup = {
  readonly key: string;
  readonly postId: number;
  readonly title: string;
  readonly kind: NoticeKind;
  readonly seen: boolean;
  readonly authors: readonly string[];
  readonly latest: CommunityNotice;
  readonly commentIds: readonly number[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function noticeKind(notice: Pick<CommunityNotice, "replyToId">): NoticeKind {
  if (notice.replyToId) return "reply";
  return "comment";
}

export function groupNotices(items: readonly CommunityNotice[]): readonly NoticeGroup[] {
  const groups = new Map<string, NoticeGroup>();
  for (const item of items) groups.set(groupKey(item), addTo(groups.get(groupKey(item)), item));
  return [...groups.values()];
}

function groupKey(item: CommunityNotice): string {
  return `${item.postId}:${noticeKind(item)}:${item.seen}`;
}

function addTo(group: NoticeGroup | undefined, item: CommunityNotice): NoticeGroup {
  if (!group) {
    return { key: groupKey(item), postId: item.postId, title: item.title, kind: noticeKind(item), seen: item.seen,
      authors: [item.author], latest: item, commentIds: [item.commentId] };
  }
  return { ...group, authors: withAuthor(group.authors, item.author), commentIds: [...group.commentIds, item.commentId] };
}

/** 익명 번호와 공개 이름은 같은 사람으로 한 번만 센다. 비공개·알 수 없는 작성자는 서로 다를 수 있어 따로 센다. */
function withAuthor(authors: readonly string[], author: string): readonly string[] {
  if (authors.includes(author) && !UNNAMED.has(author)) return authors;
  return [...authors, author];
}

const UNNAMED: ReadonlyMap<string, string> = new Map([["프로필 비공개", "비공개 배우가"], ["알 수 없는 사용자", "알 수 없는 사용자가"]]);

function subject(author: string): string {
  return UNNAMED.get(author) ?? `${author}님이`;
}

/** "익명2님이 내 글에 댓글을 남겼어요", "익명2 외 2명이 내 댓글에 답글을 남겼어요". */
export function noticeHeadline(group: Pick<NoticeGroup, "authors" | "kind">): string {
  const [first, ...rest] = group.authors;
  const what = KIND_TEXT[group.kind];
  if (rest.length > 0) return `${first} 외 ${rest.length}명이 ${what}`;
  return `${subject(first)} ${what}`;
}

const KIND_TEXT: Readonly<Record<NoticeKind, string>> = {
  comment: "내 글에 댓글을 남겼어요",
  reply: "내 댓글에 답글을 남겼어요",
};

/** 이용자 기기의 날짜 기준으로 오늘·최근 7일(오늘 포함)·그 이전으로 나눈다. */
export function noticePeriod(createdAt: string, now: Date): NoticePeriod {
  const created = new Date(createdAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (created.getTime() >= startOfToday) return "오늘";
  if (created.getTime() >= startOfToday - 6 * DAY_MS) return "최근 7일";
  return "이전";
}

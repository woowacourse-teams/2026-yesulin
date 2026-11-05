import type { CommunityEntry, CommunityPage } from "./types";

export function mergeComments(previous: readonly CommunityEntry[], incoming: readonly CommunityEntry[]) {
  const entries = new Map(previous.map(entry => [entry.id, entry]));
  incoming.forEach(entry => entries.set(entry.id, entry));
  return [...entries.values()].sort((left, right) => left.id - right.id);
}

export async function loadThroughComment(loader: (after?: number) => Promise<CommunityPage>, after: number, target: number) {
  let page = await loader(after);
  let items = [...page.items];
  while (page.nextCursor !== null && !items.some(item => item.id >= target)) {
    const next = await loader(page.nextCursor);
    if (next.nextCursor === page.nextCursor) throw new Error("댓글 목록을 다시 불러와 주세요.");
    items = mergeComments(items, next.items);
    page = next;
  }
  return { items, nextCursor: page.nextCursor };
}

type CommentThread = { id: number; root?: CommunityEntry; replies: CommunityEntry[] };

export function commentThreads(items: readonly CommunityEntry[]) {
  const threads = new Map<number, CommentThread>();
  for (const item of items) {
    const id = item.replyToId ?? item.id;
    const thread: CommentThread = threads.get(id) ?? { id, replies: [] };
    threads.set(id, thread);
    if (item.replyToId != null) thread.replies.push(item);
    if (item.replyToId == null) thread.root = item;
  }
  return [...threads.values()].sort((left, right) => left.id - right.id);
}

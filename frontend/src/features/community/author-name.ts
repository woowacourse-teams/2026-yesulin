import type { CommunityEntry } from "./types";

const colors = ["하늘", "노을", "새벽", "은빛", "달빛", "봄빛", "별빛", "햇살"];
const names = ["구름", "여우", "고래", "나비", "사슴", "수달", "토끼", "제비", "펭귄"];

export function authorName(entry: CommunityEntry, postId: number) {
  if (entry.authorMode !== "ANONYMOUS" || !entry.postAuthor) return entry.author;
  const color = colors[postId % colors.length];
  const name = names[postId % names.length];
  return `익명 · ${color}${name}`;
}

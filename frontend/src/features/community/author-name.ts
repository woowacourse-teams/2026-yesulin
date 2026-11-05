import type { CommunityEntry } from "./types";

export function feedAuthor(entry: Pick<CommunityEntry, "authorMode" | "author">) {
  if (entry.authorMode === "ANONYMOUS") return "익명";
  return entry.author;
}

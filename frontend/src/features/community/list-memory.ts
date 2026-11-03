import type { CommunityPage } from "./types";

export const communityListMemory: { page: CommunityPage | null; scroll: number; savedAt: number } = {
  page: null,
  scroll: 0,
  savedAt: 0,
};

export function recentCommunityList() {
  if (Date.now() - communityListMemory.savedAt > 60_000) return null;
  return communityListMemory.page;
}

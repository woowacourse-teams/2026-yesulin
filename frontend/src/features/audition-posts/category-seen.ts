import { AUDITION_POST_CATEGORIES, type AuditionLandingCategory, type AuditionPostSummary } from "./types";

const STORAGE_KEY = "yesulin:category-seen";
const MAX_BADGE = 99;

/** 분야별로 마지막으로 공고를 확인한 시각(ISO). 이 브라우저에만 남는다. */
export type CategorySeen = Readonly<Partial<Record<AuditionLandingCategory, string>>>;
export type NewPostCounts = Readonly<Partial<Record<AuditionLandingCategory, number>>>;

function readSeen(): CategorySeen {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CategorySeen;
  } catch {
    return {};
  }
}

function writeSeen(seen: CategorySeen): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // 저장소를 쓸 수 없으면 배지 없이 동작한다.
  }
}

/** 기록이 없는 분야는 지금 본 것으로 두어 첫 방문에는 배지를 띄우지 않는다. */
export function ensureCategorySeen(now: Date = new Date()): CategorySeen {
  const seen = { ...readSeen() };
  const missing = AUDITION_POST_CATEGORIES.filter((category) => !seen[category]);
  if (missing.length === 0) return seen;
  missing.forEach((category) => { seen[category] = now.toISOString(); });
  writeSeen(seen);
  return seen;
}

export function markCategorySeen(category: AuditionLandingCategory, now: Date = new Date()): void {
  writeSeen({ ...readSeen(), [category]: now.toISOString() });
}

/** 분야별로 마지막 확인 이후 올라온 공고 수. */
export function newPostCounts(posts: readonly AuditionPostSummary[], seen: CategorySeen): NewPostCounts {
  const counts: Partial<Record<AuditionLandingCategory, number>> = {};
  posts.forEach((post) => {
    const category = post.category as AuditionLandingCategory;
    const since = seen[category];
    if (!since || !post.postedAt || post.postedAt <= since) return;
    counts[category] = (counts[category] ?? 0) + 1;
  });
  return counts;
}

export function badgeLabel(count: number): string {
  return `+${Math.min(count, MAX_BADGE)}`;
}

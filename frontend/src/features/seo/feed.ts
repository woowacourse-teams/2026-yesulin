import "server-only";
import { auditionPostForServer, publishedAuditionPostPageForServer } from "@/features/audition-posts/server";
import { publicShowForServer, publicShowsForServer } from "@/features/shows/server";
import { auditionFeedItem, showFeedItem, type FeedItem } from "./rss";

const RECENT_POST_LIMIT = 48;
const CONCURRENT_READS = 8;

/** 목록 조회 후 내려간 콘텐츠는 제외하고, 일시적인 서버 오류는 피드 전체의 실패로 알린다. */
export async function publicFeedItems(): Promise<readonly FeedItem[]> {
  const [page, shows] = await Promise.all([
    publishedAuditionPostPageForServer({ page: 0, includeClosed: true }, RECENT_POST_LIMIT),
    publicShowsForServer(),
  ]);
  if (!page || !shows) throw new Error("RSS 서버 API가 설정되지 않았습니다.");
  const reads = [
    ...page.posts.map((post) => async (): Promise<FeedItem | null> => {
      const found = await auditionPostForServer(String(post.id));
      if (found.kind === "client-only") throw new Error("RSS 공고 API가 설정되지 않았습니다.");
      return found.kind === "published" ? auditionFeedItem(found.post) : null;
    }),
    ...shows.map((show) => async (): Promise<FeedItem | null> => {
      const found = await publicShowForServer(show.id);
      if (found.status === "client-only") throw new Error("RSS 공연 API가 설정되지 않았습니다.");
      return found.status === "ready" ? showFeedItem(found.show) : null;
    }),
  ];
  const items: FeedItem[] = [];
  for (let start = 0; start < reads.length; start += CONCURRENT_READS) {
    const batch = await Promise.all(reads.slice(start, start + CONCURRENT_READS).map((read) => read()));
    items.push(...batch.filter((item): item is FeedItem => item !== null));
  }
  return items;
}

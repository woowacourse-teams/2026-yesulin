import { publicFeedItems } from "@/features/seo/feed";
import { createRss } from "@/features/seo/rss";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return new Response(createRss(await publicFeedItems()), {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (cause) {
    console.error("[RSS 조회 실패]", cause);
    return new Response("RSS를 불러오지 못했습니다.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
}

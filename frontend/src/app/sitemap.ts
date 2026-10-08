import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { auditionPostIdsForSitemap } from "@/features/audition-posts/server";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { publicShowsForServer } from "@/features/shows/server";
import { showRoutes } from "@/features/shows/types";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [shows, postIds] = await Promise.all([publicShowsForServer(), auditionPostIdsForSitemap()]);
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/producer-service`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}${showRoutes.list}`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...(shows ?? []).map((show) => ({
      url: `${SITE_URL}${showRoutes.detail(show.id)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...postIds.map((postId) => ({
      url: `${SITE_URL}${auditionPostRoutes.detail(postId)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

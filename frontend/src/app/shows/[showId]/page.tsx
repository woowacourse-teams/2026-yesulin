import type { Metadata } from "next";
import { PublicShowRoute } from "@/components/shows/public-show-route";
import { formatShowPeriod, showAvailability } from "@/features/shows/format";
import { publicShowForServer } from "@/features/shows/server";
import { SHOW_GENRE_LABELS, showRoutes } from "@/features/shows/types";

export async function generateMetadata({ params }: { params: Promise<{ showId: string }> }): Promise<Metadata> {
  const { showId } = await params;
  const show = await publicShowForServer(showId);
  if (!show) return { title: "공연", robots: { index: false, follow: true } };
  const canonical = showRoutes.detail(showId);
  const availability = showAvailability(show);
  const description = `${SHOW_GENRE_LABELS[show.genre]} · ${show.venue.name} · ${formatShowPeriod(show.sessions)} · ${availability.kind === "open" ? "무료 예매 중" : availability.label}`;
  return {
    title: show.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: canonical,
      siteName: "예술in",
      title: show.title,
      description,
      images: [{ url: show.posterUrl, alt: `${show.title} 공연 포스터` }],
    },
    twitter: { card: "summary_large_image", title: show.title, description, images: [show.posterUrl] },
  };
}

export default async function ShowPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  const show = await publicShowForServer(showId);
  return <PublicShowRoute showId={showId} initialShow={show} />;
}

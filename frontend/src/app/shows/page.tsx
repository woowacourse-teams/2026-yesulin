import type { Metadata } from "next";
import { PublicShowList } from "@/components/shows/public-show-list";
import { publicShowsForServer } from "@/features/shows/server";
import { showRoutes } from "@/features/shows/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: showRoutes.list },
};

export default async function ShowsPage() {
  const shows = await publicShowsForServer();
  return <PublicShowList initialShows={shows} />;
}

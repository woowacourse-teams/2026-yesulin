import type { Metadata } from "next";
import { PublicShowList } from "@/components/shows/public-show-list";
import { showRoutes } from "@/features/shows/types";

export const metadata: Metadata = {
  alternates: { canonical: showRoutes.list },
};

export default function ShowsPage() {
  return <PublicShowList />;
}

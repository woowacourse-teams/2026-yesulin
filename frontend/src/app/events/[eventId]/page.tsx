import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventRoute } from "@/components/events/event-detail";
import { eventForServer } from "@/features/events/server";
import { eventRoutes } from "@/features/events/types";

const EVENT_ID = /^[1-9][0-9]{0,17}$/;

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params;
  if (!EVENT_ID.test(eventId)) notFound();
  const found = await eventForServer(eventId);
  if (found.kind === "missing") notFound();
  const canonical = eventRoutes.detail(eventId);
  if (found.kind === "client-only") return { title: "이벤트", alternates: { canonical } };
  const { event } = found;
  const description = event.summary ?? event.body.slice(0, 120);
  return {
    title: event.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url: canonical,
      siteName: "예술in",
      title: event.title,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!EVENT_ID.test(eventId)) notFound();
  const found = await eventForServer(eventId);
  if (found.kind === "missing") notFound();
  return <EventRoute eventId={eventId} initial={found.kind === "published" ? found.event : null} />;
}

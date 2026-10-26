import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventRegistrationRoute } from "@/components/events/event-registration";
import { eventForServer } from "@/features/events/server";
import { eventRoutes } from "@/features/events/types";

const EVENT_ID = /^[1-9][0-9]{0,17}$/;

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params;
  if (!EVENT_ID.test(eventId)) notFound();
  const found = await eventForServer(eventId);
  if (found.kind === "missing") notFound();
  const title = found.kind === "published" ? `${found.event.title} 참가 신청` : "참가 신청";
  return {
    title,
    alternates: { canonical: eventRoutes.register(eventId) },
    robots: { index: false, follow: false },
  };
}

export default async function EventRegisterPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!EVENT_ID.test(eventId)) notFound();
  const found = await eventForServer(eventId);
  if (found.kind === "missing") notFound();
  return <EventRegistrationRoute eventId={eventId} initial={found.kind === "published" ? found.event : null} />;
}

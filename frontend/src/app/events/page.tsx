import type { Metadata } from "next";
import { EventsRoute } from "@/components/events/event-list";
import { eventsForServer } from "@/features/events/server";
import { eventRoutes } from "@/features/events/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이벤트",
  description: "예술in이 준비한 모집과 이벤트 소식을 모았어요.",
  alternates: { canonical: eventRoutes.list },
};

export default async function EventsPage() {
  // 서버에서 읽지 못하면 브라우저에서 다시 읽고, 그래도 실패하면 다시 시도를 보인다.
  const events = await eventsForServer().catch(() => null);
  return <EventsRoute initialEvents={events} />;
}

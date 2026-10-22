"use client";

import { EventScreen } from "@/components/events/event-screen";
import { ScreenError } from "@/components/auditions/screen-status";

export default function PublicDetailError({ reset }: { readonly reset: () => void }) {
  return <EventScreen backToList><ScreenError message="정보를 불러오지 못했어요." onRetry={reset} /></EventScreen>;
}

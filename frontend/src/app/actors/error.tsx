"use client";

import { ActorPageScreen } from "@/components/actor-pages/actor-page-screen";
import { ScreenError } from "@/components/auditions/screen-status";

export default function ActorsError({ reset }: { readonly reset: () => void }) {
  return <ActorPageScreen><ScreenError message="배우 목록을 불러오지 못했어요." onRetry={reset} /></ActorPageScreen>;
}

"use client";

import { ActorPageScreen } from "@/components/actor-pages/actor-page-screen";
import { ScreenError } from "@/components/auditions/screen-status";

export default function ActorPageError({ reset }: { readonly reset: () => void }) {
  return <ActorPageScreen backToList><ScreenError message="배우 페이지를 불러오지 못했어요." onRetry={reset} /></ActorPageScreen>;
}

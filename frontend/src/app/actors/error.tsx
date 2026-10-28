"use client";

import { ActorPageScreen } from "@/components/actor-pages/actor-page-screen";
import { ScreenError } from "@/components/auditions/screen-status";

/** 다시 시도할 때 서버에서 다시 읽는다. */
export default function ActorsError({ unstable_retry }: { readonly unstable_retry: () => void }) {
  return <ActorPageScreen><ScreenError message="배우 목록을 불러오지 못했어요." onRetry={unstable_retry} /></ActorPageScreen>;
}

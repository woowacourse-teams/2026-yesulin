"use client";

import { ActorPageScreen } from "@/components/actor-pages/actor-page-screen";
import { ScreenError } from "@/components/auditions/screen-status";

/** 서버 조회가 일시적으로 실패한 경우라 다시 시도할 때 서버에서 다시 읽는다. */
export default function ActorPageError({ unstable_retry }: { readonly unstable_retry: () => void }) {
  return <ActorPageScreen backToList><ScreenError message="배우 페이지를 불러오지 못했어요." onRetry={unstable_retry} /></ActorPageScreen>;
}

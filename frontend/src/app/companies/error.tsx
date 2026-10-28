"use client";

import { AuditionPostScreen } from "@/components/audition-posts/audition-post-screen";
import { ScreenError } from "@/components/auditions/screen-status";

/** 서버 조회가 일시적으로 실패한 경우라 다시 시도할 때 서버에서 다시 읽는다. */
export default function PublicDetailError({ unstable_retry }: { readonly unstable_retry: () => void }) {
  return <AuditionPostScreen><ScreenError message="정보를 불러오지 못했어요." onRetry={unstable_retry} /></AuditionPostScreen>;
}

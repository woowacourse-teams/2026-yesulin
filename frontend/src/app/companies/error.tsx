"use client";

import { AuditionPostScreen } from "@/components/audition-posts/audition-post-screen";
import { ScreenError } from "@/components/auditions/screen-status";

export default function PublicDetailError({ reset }: { readonly reset: () => void }) {
  return <AuditionPostScreen><ScreenError message="정보를 불러오지 못했어요." onRetry={reset} /></AuditionPostScreen>;
}

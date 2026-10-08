"use client";

import { AuditionPostScreen } from "@/components/audition-posts/audition-post-screen";
import { ScreenError } from "@/components/auditions/screen-status";

export default function PostError() {
  return (
    <AuditionPostScreen>
      <ScreenError message="공고 정보를 불러오지 못했어요." onRetry={() => window.location.reload()} />
    </AuditionPostScreen>
  );
}

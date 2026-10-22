"use client";

import { ScreenError } from "@/components/auditions/screen-status";
import { PublicScreen } from "@/components/landing/public-screen";

export default function ShowError({ reset }: { readonly reset: () => void }) {
  return (
    <PublicScreen backHref="/shows" backLabel="공연 목록">
      <ScreenError message="공연 정보를 불러오지 못했어요." onRetry={reset} />
    </PublicScreen>
  );
}

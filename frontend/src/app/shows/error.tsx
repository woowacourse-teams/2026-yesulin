"use client";

import { ScreenError } from "@/components/auditions/screen-status";
import { ShowPageHeader } from "@/components/shows/show-page-header";

export default function ShowError({ reset }: { readonly reset: () => void }) {
  return (
    <main className="min-h-screen bg-surface text-foreground">
      <ShowPageHeader />
      <div className="mx-auto max-w-[880px] px-5 py-8 md:px-8 min-[1200px]:max-w-[1200px]">
        <ScreenError message="공연 정보를 불러오지 못했어요." onRetry={reset} />
      </div>
    </main>
  );
}

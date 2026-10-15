"use client";

import { ScreenError } from "@/components/auditions/screen-status";
import { ShowPageHeader } from "@/components/shows/show-page-header";

export default function ShowError({ reset }: { readonly reset: () => void }) {
  return (
    <main id="main" className="min-h-screen bg-surface text-foreground">
      <ShowPageHeader />
      <div className="notebook-container py-8">
        <ScreenError message="공연 정보를 불러오지 못했어요." onRetry={reset} />
      </div>
    </main>
  );
}

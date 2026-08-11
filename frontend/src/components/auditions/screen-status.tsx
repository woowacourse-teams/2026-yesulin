import { SecondaryButton } from "@/components/ui/controls";

/** 조회 중·실패·빈 목록처럼 화면 본문 대신 보여줄 상태 표시. */
export function ScreenMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted-strong">
      <strong className="mb-2 block text-lg font-semibold text-foreground">{title}</strong>
      {children}
    </div>
  );
}

export function ScreenError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-card border border-fail/20 bg-fail-bg px-4 py-3 text-base font-medium text-fail md:text-sm"
    >
      <span className="min-w-0 flex-1">{message} 잠시 후 다시 시도해 주세요.</span>
      {onRetry ? (
        <SecondaryButton onClick={onRetry} className="border-fail/20 bg-white text-fail hover:border-fail/40 hover:bg-white">
          다시 시도
        </SecondaryButton>
      ) : null}
    </div>
  );
}

export function PickerSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-10 md:px-8 xl:px-10" aria-label="불러오는 중">
      <div className="h-7 w-56 animate-pulse rounded-lg bg-border-soft" />
      <div className="mb-6 mt-2 h-4 w-40 animate-pulse rounded bg-border-soft" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-[220px] animate-pulse rounded-card border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

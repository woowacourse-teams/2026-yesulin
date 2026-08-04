/** 조회 중·실패·빈 목록처럼 화면 본문 대신 보여줄 상태 표시. */
export function ScreenMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-card px-5 py-12 text-center text-muted">
      <strong className="mb-[5px] block text-[15px] font-semibold text-foreground">{title}</strong>
      {children}
    </div>
  );
}

export function ScreenError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-control border border-fail-bg bg-fail-bg px-4 py-3 text-sm font-medium text-fail"
    >
      {message}
    </div>
  );
}

export function PickerSkeleton() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-[34px] md:px-6" aria-label="불러오는 중">
      <div className="h-7 w-56 animate-pulse rounded-lg bg-border-soft" />
      <div className="mb-6 mt-2 h-4 w-40 animate-pulse rounded bg-border-soft" />
      <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(258px,1fr))]">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="h-[196px] animate-pulse rounded-[10px] border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

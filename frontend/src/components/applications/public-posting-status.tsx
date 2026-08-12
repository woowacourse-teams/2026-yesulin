import Link from "next/link";

export function PublicPostingUnavailable() {
  return (
    <main className="min-h-screen bg-surface px-5 py-16 sm:px-8">
      <section className="mx-auto max-w-[680px] rounded-card border border-border bg-card px-6 py-14 text-center">
        <p className="text-sm font-semibold text-fail">공고를 찾을 수 없어요</p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.025em]">유효한 공고 링크인지 확인해 주세요.</h1>
        <p className="mt-3 text-muted-strong">공고가 삭제되었거나 주소가 올바르지 않을 수 있어요.</p>
        <Link href="/" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          예술in 홈에서 공고 찾기
        </Link>
      </section>
    </main>
  );
}

export function PostingStatusBadge({ status }: { status: "OPEN" | "UPCOMING" | "CLOSED" }) {
  const label = status === "OPEN" ? "지원 가능" : status === "UPCOMING" ? "모집 예정" : "모집 마감";
  const tone = status === "OPEN" ? "border-brand-line bg-brand-soft text-brand" : status === "UPCOMING" ? "border-brand-line bg-upcoming-bg text-upcoming" : "border-border bg-surface text-muted-strong";
  const symbol = status === "OPEN" ? "●" : status === "UPCOMING" ? "◷" : "−";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${tone}`}><span aria-hidden="true">{symbol}</span>{label}</span>;
}

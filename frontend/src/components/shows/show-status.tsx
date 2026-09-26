import Link from "next/link";
import type { SessionAvailability } from "@/features/shows/format";
import { showRoutes } from "@/features/shows/types";

export function ShowStatusBadge({ status }: { readonly status: "OPEN" | "CLOSED" }) {
  const open = status === "OPEN";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${open ? "border-brand-line bg-brand-soft text-brand" : "border-border bg-surface text-muted-strong"}`}>
      <span aria-hidden="true">{open ? "●" : "−"}</span>
      {open ? "예매 중" : "예매 종료"}
    </span>
  );
}

const AVAILABILITY_TONE: Record<SessionAvailability["kind"], string> = {
  available: "text-muted-strong",
  few: "text-warn",
  soldOut: "text-fail",
  closed: "text-muted",
};

export function SessionAvailabilityText({ availability }: { readonly availability: SessionAvailability }) {
  return <span className={`num text-sm font-semibold ${AVAILABILITY_TONE[availability.kind]}`}>{availability.label}</span>;
}

export function ShowUnavailable() {
  return (
    <main className="min-h-screen bg-surface px-5 py-16 sm:px-8">
      <section className="mx-auto max-w-[680px] rounded-card border border-border bg-card px-6 py-14 text-center">
        <p className="text-sm font-semibold text-fail">공연을 찾을 수 없어요</p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.025em]">공연 링크가 올바른지 확인해 주세요.</h1>
        <p className="mt-3 text-muted-strong">공연이 내려갔거나 주소가 올바르지 않을 수 있어요.</p>
        <Link
          href={showRoutes.list}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          다른 공연 보기
        </Link>
      </section>
    </main>
  );
}

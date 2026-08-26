import type { AdminOverview } from "@/features/admin/types";

type Props = {
  readonly overview: AdminOverview;
};

type Card = {
  readonly label: string;
  readonly value: number;
  readonly hint?: string;
  readonly emphasis?: boolean;
};

function toCards(overview: AdminOverview): readonly Card[] {
  return [
    {
      label: "이메일 미인증 기획사",
      value: overview.pendingProducers,
      hint: "인증 전이거나 수동 활성화 필요",
      emphasis: overview.pendingProducers > 0,
    },
    { label: "기획사/제작사", value: overview.producers, hint: `활성 ${overview.activeProducers}` },
    { label: "배우", value: overview.applicants },
    { label: "공연", value: overview.performances },
    {
      label: "공고",
      value: overview.auditions,
      hint: `공개 ${overview.publishedAuditions} · 작성중 ${overview.draftAuditions} · 마감 ${overview.closedAuditions}`,
    },
    { label: "지원서", value: overview.submissions, hint: `최근 7일 +${overview.newSubmissionsInLastWeek}` },
    { label: "최근 7일 신규 기획사", value: overview.newProducersInLastWeek },
  ];
}

export function AdminOverviewCards({ overview }: Props) {
  return (
    <section aria-labelledby="overview-heading" className="flex flex-col gap-3">
      <h2 id="overview-heading" className="text-sm font-semibold text-neutral-500">현재 DB 현황</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {toCards(overview).map((card) => (
          <div
            key={card.label}
            className={`rounded border px-4 py-3 ${card.emphasis ? "border-amber-400 bg-amber-50" : "border-neutral-200 bg-white"}`}
          >
            <p className="text-xs text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{card.value}</p>
            {card.hint ? <p className="mt-1 text-xs text-neutral-400">{card.hint}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

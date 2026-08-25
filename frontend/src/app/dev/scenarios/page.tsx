import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { frontendEnvironment } from "@/config/environment";
import { MOCK_SCENARIOS } from "@/mocks/scenario-definitions";

export const metadata: Metadata = {
  title: "목 시나리오 허브",
  robots: { index: false, follow: false },
};

export default function MockScenarioHubPage() {
  if (process.env.NODE_ENV === "production" || !frontendEnvironment.apiMockingEnabled) notFound();
  const areas = ["지원 양식", "심사 흐름"] as const;

  return <main className="min-h-screen bg-surface px-5 py-10 text-foreground md:px-8 md:py-14">
    <div className="mx-auto max-w-[1120px]">
      <header className="rounded-modal border border-brand-line bg-card p-6 shadow-[var(--shadow-1)] md:p-9">
        <p className="text-sm font-semibold text-brand">Frontend scenario lab</p>
        <h1 className="mt-2 text-[clamp(30px,5vw,48px)] font-bold tracking-[-0.04em]">목 시나리오 허브</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted-strong">백엔드 구현 전에 지원 양식과 차수별 심사 흐름을 같은 데이터로 반복 검증합니다. 각 화면에서 상태를 바꾼 뒤 초기 상태로 돌아오려면 새로고침하세요.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted"><span className="rounded-full bg-brand-soft px-3 py-1.5 text-brand">개발 환경 전용</span><span className="rounded-full bg-surface px-3 py-1.5">모바일 390px</span><span className="rounded-full bg-surface px-3 py-1.5">데스크톱 1440px</span></div>
      </header>

      {areas.map((area) => <section key={area} aria-labelledby={`scenario-${area}`} className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Scenario group</p><h2 id={`scenario-${area}`} className="mt-1 text-2xl font-bold">{area}</h2></div><span className="num text-sm text-muted">{MOCK_SCENARIOS.filter((scenario) => scenario.area === area).length}개</span></div>
        <div className="grid gap-4 md:grid-cols-2">{MOCK_SCENARIOS.filter((scenario) => scenario.area === area).map((scenario) => <article key={scenario.id} className="flex min-w-0 flex-col rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] md:p-6">
          <div className="flex items-start gap-3"><span className="num grid h-8 min-w-8 place-items-center rounded-full bg-brand-soft px-2 text-xs font-bold text-brand">{scenario.id.split("-").at(-1)}</span><div className="min-w-0"><h3 className="text-lg font-bold tracking-[-0.02em]">{scenario.title}</h3><p className="mt-2 text-sm leading-6 text-muted-strong">{scenario.description}</p></div></div>
          <ul className="mt-5 space-y-2 border-t border-border-soft pt-4">{scenario.checks.map((check) => <li key={check} className="flex gap-2 text-sm leading-6 text-muted-strong"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{check}</li>)}</ul>
          <Link href={scenario.href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">시나리오 열기 <span aria-hidden="true" className="ml-2">→</span></Link>
        </article>)}</div>
      </section>)}
    </div>
  </main>;
}

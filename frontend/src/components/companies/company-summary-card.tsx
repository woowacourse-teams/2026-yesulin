import Link from "next/link";
import { companyRoutes, displayHomepage, formatFoundedOn, type CompanySummary } from "@/features/companies/types";

/** 공고 상세 아래에 붙는 공연사 요약. 비워 둔 항목은 줄째 뺀다. */
export function CompanySummaryCard({ company }: { readonly company: CompanySummary }) {
  return (
    <section aria-labelledby="post-company" className="mt-4 rounded-card border border-border bg-card px-5 py-5 sm:px-8 sm:py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-semibold text-brand">공고를 올린 공연사</p>
        <Link
          href={companyRoutes.detail(company.id)}
          className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-brand-soft hover:text-brand"
        >
          공연사 정보 전체보기 <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      </div>
      <h2 id="post-company" className="mt-1 text-lg font-bold tracking-[-0.02em]">{company.name}</h2>
      <CompanyFacts company={company} className="mt-4" />
    </section>
  );
}

/** 대표자·홈페이지·설립일·위치. 공고 카드와 공연사 화면이 함께 쓴다. */
export function CompanyFacts({ company, className = "" }: {
  readonly company: CompanySummary;
  readonly className?: string;
}) {
  const facts = [
    company.representativeName ? { label: "대표", value: company.representativeName } : null,
    company.homepage ? {
      label: "홈페이지",
      value: (
        <a
          href={company.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-brand underline-offset-2 hover:underline"
        >
          {displayHomepage(company.homepage)}<span className="sr-only"> 새 창</span> <span aria-hidden="true">↗</span>
        </a>
      ),
    } : null,
    company.foundedOn ? { label: "설립", value: <span className="num">{formatFoundedOn(company.foundedOn)}</span> } : null,
    company.location ? { label: "위치", value: company.location } : null,
  ].filter((fact) => fact !== null);
  if (!facts.length) return null;

  return (
    <dl className={`grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 ${className}`}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 gap-3">
          <dt className="w-16 shrink-0 text-muted">{fact.label}</dt>
          <dd className="min-w-0 font-medium">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

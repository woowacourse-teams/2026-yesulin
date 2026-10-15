import Link from "next/link";
import { CompanyAvatar } from "./company-avatar";
import {
  COMPANY_CORRECTION_URL,
  companyRoutes,
  displayLink,
  formatFoundedOn,
  UNDISCLOSED,
  type CompanySummary,
} from "@/features/companies/types";

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
          공연사 정보 전체보기
        </Link>
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-3">
        <CompanyAvatar name={company.name} photoUrl={company.photoUrl} size="md" />
        <h2 id="post-company" className="min-w-0 break-words text-lg font-bold tracking-[-0.02em]">{company.name}</h2>
      </div>
      <CompanyFacts company={company} className="mt-4" />
    </section>
  );
}

/** 대표자·링크·설립일·위치. 공고 카드와 공연사 화면이 함께 쓰며, 비워 두었거나 공개하지 않은 항목은 "비공개"로 보인다. */
export function CompanyFacts({ company, className = "" }: {
  readonly company: CompanySummary;
  readonly className?: string;
}) {
  const facts = [
    { label: "대표", value: company.representativeName },
    {
      label: "링크",
      value: company.links.length ? (
        <span className="flex min-w-0 flex-col gap-0.5">
          {company.links.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-brand underline-offset-2 hover:underline"
            >
              {displayLink(link)}<span className="sr-only"> 새 창</span>
            </a>
          ))}
        </span>
      ) : null,
    },
    { label: "설립", value: company.foundedOn ? <span className="num">{formatFoundedOn(company.foundedOn)}</span> : null },
    { label: "위치", value: company.location },
  ];

  return (
    <dl className={`grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 ${className}`}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 gap-3">
          <dt className="w-16 shrink-0 text-muted">{fact.label}</dt>
          <dd className="min-w-0 font-medium">{fact.value ?? <Undisclosed />}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 비워 두었거나 공개하지 않은 항목. */
export function Undisclosed() {
  return <span className="font-normal text-muted">{UNDISCLOSED}</span>;
}

/** 공연사 정보를 아직 준비하지 않은 공고. 원문 작성자 이름과 등록 요청 창구만 보여 준다. */
export function CompanyPendingCard({ authorName }: { readonly authorName: string }) {
  return (
    <section aria-labelledby="post-company" className="mt-4 rounded-card border border-dashed border-border bg-card px-5 py-5 sm:px-8 sm:py-6">
      <p className="text-sm font-semibold text-brand">공고를 올린 공연사</p>
      <h2 id="post-company" className="mt-1 text-lg font-bold tracking-[-0.02em]">{authorName || "공연사"}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-strong">공연사 정보를 준비하고 있어요.</p>
      <a
        href={COMPANY_CORRECTION_URL}
        target="_blank"
        rel="noreferrer"
        className="-ml-2 mt-1 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-brand-soft hover:text-brand"
      >
        이 공연사라면 정보 등록 요청하기<span className="sr-only"> 새 창</span>
      </a>
    </section>
  );
}

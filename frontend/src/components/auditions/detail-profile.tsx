import type { Applicant, RoundState } from "@/features/auditions/types";
import { featuredCareers, orderedCareersByRecency } from "@/features/auditions/featured-careers";
import { safeExternalUrl } from "@/features/auditions/safe-external-url";
import { applicantEducationText } from "@/features/auditions/education-text";
import { StatusBadge } from "./status-badge";

export function DetailProfile({ applicant, rounds }: { applicant: Applicant; rounds: readonly RoundState[] }) {
  const externalLinks = applicant.links.flatMap((link) => {
    const url = safeExternalUrl(link);
    return url === null ? [] : [{ label: link, url }];
  });

  return (
    <div className="overflow-y-auto px-6 pb-6 pt-5">
      <div className="mb-6 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(94px,1fr))]">
        <Fact label="나이" value={applicant.age} unit="세" />
        <Fact label="키" value={applicant.height} unit="cm" />
        <Fact label="몸무게" value={applicant.weight} unit="kg" />
        <Fact label="경력" value={applicant.career.length} unit="건" />
        <EducationFact applicant={applicant} />
      </div>

      <CareerSection careers={applicant.career} />

      {externalLinks.length > 0 ? (
        <Section title="SNS / 외부 링크">
          <ul className="space-y-2">
            {externalLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate rounded-control border border-border bg-surface px-3 py-2.5 text-dense text-brand hover:border-brand-line hover:bg-brand-soft"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="자기소개서">
        <Essay text={applicant.coverLetter} />
      </Section>

      {applicant.questions.length > 0 ? (
        <Section title="추가 질문">
          <div className="space-y-3">
            {applicant.questions.map((question, index) => (
              <div key={`${question.question}-${index}`} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold leading-5 text-muted">{question.question}</p>
                <p className="mt-2 whitespace-pre-wrap text-dense leading-[1.75] text-muted-strong">{question.answer}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="검토 정보">
        <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-dense">
          <dt className="text-muted">연락처</dt>
          <dd className="num">{applicant.phone}</dd>
          <dt className="text-muted">이메일</dt>
          <dd className="break-all">{applicant.email}</dd>
          <dt className="text-muted">접수일</dt>
          <dd className="num">
            <time dateTime={applicant.submittedAt} title={applicant.submittedAt}>
              {formatSubmittedAt(applicant.submittedAt)}
            </time>
          </dd>
        </dl>
      </Section>

      <Section title="차수별 기록">
        <ul className="text-dense">
          {rounds.map((roundState) => {
            const review = applicant.reviewHistory[roundState.round];
            return (
              <li
                key={roundState.round}
                className="flex items-center gap-2.5 border-b border-border-soft py-2 last:border-b-0"
              >
                <span className="w-10 shrink-0 text-xs text-muted">{roundState.round}차</span>
                {review ? (
                  <>
                    <StatusBadge status={review.status} memo={review.memo} />
                    {review.note.trim() ? (
                      <span
                        title={review.note}
                        className="truncate text-xs text-muted"
                      >{review.note}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-muted">해당 없음</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="sr-only">{rounds.map((round) => `${round.round}차 ${round.name}`).join(", ")}</p>
      </Section>
    </div>
  );
}

function CareerSection({ careers }: { careers: Applicant["career"] }) {
  const ordered = orderedCareersByRecency(careers);
  const featured = featuredCareers(careers);
  const remaining = ordered.slice(featured.length);

  return (
    <Section title={`주요 경력 ${careers.length}건`}>
      {featured.length === 0 ? <p className="text-dense text-muted">등록된 경력이 없습니다.</p> : null}
      {featured.length > 0 ? <CareerList careers={featured} /> : null}
      {remaining.length > 0 ? (
        <details className="mt-3 rounded-control border border-border bg-surface px-3 py-2.5">
          <summary className="cursor-pointer text-dense font-semibold text-muted-strong">전체 경력 보기 ({careers.length}건)</summary>
          <div className="mt-3 border-t border-border-soft pt-1"><CareerList careers={remaining} /></div>
        </details>
      ) : null}
    </Section>
  );
}

function CareerList({ careers }: { careers: readonly Applicant["career"][number][] }) {
  return (
    <ul className="text-dense">
      {careers.map((entry, index) => (
        <li key={`${entry.year}-${entry.title}-${index}`} className="mb-1 border-l-2 border-border py-2 pl-3.5 last:mb-0">
          <span className="num block text-xs tracking-[0.02em] text-muted">{entry.year}</span>
          {entry.title} — {entry.part}
        </li>
      ))}
    </ul>
  );
}

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function Fact({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-0.5 text-[17px] font-bold tracking-[-0.02em]">
        {value ?? "미수집"}
        {value === null ? null : <small className="ml-0.5 text-xs font-medium text-muted">{unit}</small>}
      </div>
    </div>
  );
}

function EducationFact({ applicant }: { applicant: Applicant }) {
  return <div className="rounded-lg border border-border bg-card px-3 py-2.5 [grid-column:span_2]">
    <div className="text-xs text-muted">학력</div>
    <div className="mt-0.5 truncate text-[15px] font-bold tracking-[-0.02em]">{applicantEducationText(applicant)}</div>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.05em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Essay({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface px-4 py-3 text-dense leading-[1.75] text-muted-strong">
      {text}
    </div>
  );
}

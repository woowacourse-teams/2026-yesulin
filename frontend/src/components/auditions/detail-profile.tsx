import { ROUND_LABELS } from "@/features/auditions/labels";
import type { Applicant } from "@/features/auditions/types";
import { ROUND_NUMBERS } from "@/features/auditions/types";
import { StatusBadge } from "./status-badge";

export function DetailProfile({ applicant }: { applicant: Applicant }) {
  return (
    <div className="overflow-y-auto px-6 pb-6 pt-5">
      <div className="mb-6 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(94px,1fr))]">
        <Fact label="나이" value={applicant.age} unit="세" />
        <Fact label="키" value={applicant.height} unit="cm" />
        <Fact label="몸무게" value={applicant.weight} unit="kg" />
        <Fact label="경력" value={applicant.career.length} unit="건" />
      </div>

      <Section title="기본 정보">
        <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-dense">
          <dt className="text-muted">생년월</dt>
          <dd className="num">{applicant.birth}</dd>
          <dt className="text-muted">연락처</dt>
          <dd className="num">{applicant.phone}</dd>
          <dt className="text-muted">이메일</dt>
          <dd className="break-all">{applicant.email}</dd>
          <dt className="text-muted">학교</dt>
          <dd>{applicant.school}</dd>
          <dt className="text-muted">접수일</dt>
          <dd className="num">{applicant.submittedAt}</dd>
        </dl>
      </Section>

      <Section title="자기소개서">
        <Essay text={applicant.coverLetter} />
      </Section>

      <Section title="지원 동기">
        <Essay text={applicant.motivation} />
      </Section>

      <Section title={`경력 ${applicant.career.length}건`}>
        <ul className="text-dense">
          {applicant.career.map((entry, index) => (
            <li key={`${entry.year}-${index}`} className="mb-1 border-l-2 border-border py-2 pl-3.5">
              <span className="num block text-xs tracking-[0.02em] text-muted">{entry.year}</span>
              {entry.title} — {entry.part}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="차수별 기록">
        <ul className="text-dense">
          {ROUND_NUMBERS.map((round) => {
            const review = applicant.reviewHistory[round];
            return (
              <li
                key={round}
                className="flex items-center gap-2.5 border-b border-border-soft py-2 last:border-b-0"
              >
                <span className="w-10 shrink-0 text-xs text-muted">{round}차</span>
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
        <p className="sr-only">{ROUND_NUMBERS.map((round) => ROUND_LABELS[round]).join(", ")}</p>
      </Section>
    </div>
  );
}

function Fact({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-0.5 text-[17px] font-bold tracking-[-0.02em]">
        {value}
        <small className="ml-0.5 text-xs font-medium text-muted">{unit}</small>
      </div>
    </div>
  );
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

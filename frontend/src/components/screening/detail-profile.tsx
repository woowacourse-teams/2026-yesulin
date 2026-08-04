"use client";

import { useState } from "react";
import { ROUND_LABELS } from "@/features/screening/labels";
import type { Applicant } from "@/features/screening/types";
import { ROUND_NUMBERS } from "@/features/screening/types";
import { StatusBadge } from "./status-badge";

export function DetailProfile({ applicant }: { applicant: Applicant }) {
  return (
    <div className="overflow-y-auto px-[22px] pb-[26px] pt-[18px]">
      <div className="mb-[22px] grid gap-[9px] [grid-template-columns:repeat(auto-fit,minmax(94px,1fr))]">
        <Fact label="나이" value={applicant.age} unit="세" />
        <Fact label="키" value={applicant.height} unit="cm" />
        <Fact label="몸무게" value={applicant.weight} unit="kg" />
        <Fact label="경력" value={applicant.career.length} unit="건" />
      </div>

      <Section title="기본 정보">
        <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-[9px] text-[13.5px]">
          <dt className="text-muted">생년월</dt>
          <dd className="num">{applicant.birth}</dd>
          <dt className="text-muted">연락처</dt>
          <dd className="num">{applicant.phone}</dd>
          <dt className="text-muted">이메일</dt>
          <dd className="break-all">{applicant.email}</dd>
          <dt className="text-muted">학교</dt>
          <dd>{applicant.school}</dd>
          <dt className="text-muted">접수</dt>
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
        <ul className="text-[13.5px]">
          {applicant.career.map((entry, index) => (
            <li key={`${entry.year}-${index}`} className="mb-[3px] border-l-2 border-border py-[9px] pl-3.5">
              <span className="num block text-[11.5px] tracking-[0.02em] text-muted">{entry.year}</span>
              {entry.title} — {entry.part}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="차수별 기록">
        <ul className="text-[13.5px]">
          {ROUND_NUMBERS.map((round) => {
            const review = applicant.reviewHistory[round];
            return (
              <li
                key={round}
                className="flex items-center gap-2.5 border-b border-border-soft py-[9px] last:border-b-0"
              >
                <span className="w-10 shrink-0 text-[12.5px] text-muted">{round}차</span>
                {review ? (
                  <>
                    <StatusBadge status={review.status} memo={review.memo} />
                    {review.note.trim() ? (
                      <span
                        title={review.note}
                        className="truncate text-xs text-muted"
                      >{`📝 ${review.note}`}</span>
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
      <div className="text-[11px] text-muted">{label}</div>
      <div className="num mt-0.5 text-[17px] font-bold tracking-[-0.02em]">
        {value}
        <small className="ml-0.5 text-[11.5px] font-medium text-muted">{unit}</small>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[22px]">
      <h3 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

/** 긴 글은 접어 두고 필요할 때만 펼친다. 목록 레이아웃이 글 길이에 휘둘리지 않게 한다. */
function Essay({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-lg border border-border bg-surface px-[15px] py-[13px] text-[13.5px] leading-[1.75] text-muted-strong transition-[max-height] duration-200 ${
          expanded
            ? "max-h-[1000px]"
            : "max-h-24 after:absolute after:inset-x-0 after:bottom-0 after:h-[34px] after:bg-gradient-to-b after:from-transparent after:to-surface"
        }`}
      >
        {text}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="mt-[7px] border-b border-brand-line text-xs font-semibold text-brand hover:border-brand"
      >
        {expanded ? "접기" : "전체 보기"}
      </button>
    </>
  );
}

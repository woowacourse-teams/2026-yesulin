"use client";

import { Fragment, useState } from "react";
import type { AdminAudition } from "@/features/admin/types";
import { AdminSubmissionBrowser } from "./admin-submission-browser";
import { formatDateTime, orDash } from "./admin-format";

type Props = {
  readonly auditions: readonly AdminAudition[];
  readonly onChanged: () => void;
};

const HEADERS = ["공고", "공연", "회사", "상태", "생성", "공개", "지원서", "관리"];

const STATUS_LABEL: Record<AdminAudition["status"], string> = {
  DRAFT: "작성 중",
  PUBLISHED: "공개",
  CLOSED: "마감",
};

export function AdminAuditionTable({ auditions, onChanged }: Props) {
  const [expandedAuditionId, setExpandedAuditionId] = useState<string | null>(null);

  return (
    <section aria-labelledby="auditions-heading" className="flex flex-col gap-3">
      <h2 id="auditions-heading" className="text-sm font-semibold text-muted">
        공고 ({auditions.length})
      </h2>
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditions.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-3 py-6 text-center text-muted">
                  등록된 공고가 없습니다.
                </td>
              </tr>
            ) : null}
            {auditions.map((audition) => {
              const expanded = expandedAuditionId === audition.auditionId;
              return <Fragment key={audition.auditionId}>
                <tr className="border-t border-border-soft">
                  <td className="px-3 py-2 text-foreground">{audition.title}</td>
                  <td className="px-3 py-2 text-muted-strong">{orDash(audition.performanceTitle)}</td>
                  <td className="px-3 py-2 text-muted-strong">{orDash(audition.companyName)}</td>
                  <td className="px-3 py-2 text-muted-strong">{STATUS_LABEL[audition.status]}</td>
                  <td className="px-3 py-2 text-muted">{formatDateTime(audition.createdAt)}</td>
                  <td className="px-3 py-2 text-muted">{formatDateTime(audition.publishedAt)}</td>
                  <td className="px-3 py-2 num text-muted-strong">{audition.submissionCount}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedAuditionId(expanded ? null : audition.auditionId)}
                      className="min-h-11 rounded-control border border-border px-3 text-sm font-medium text-muted-strong hover:bg-surface"
                    >
                      {expanded ? "접기" : "지원서 보기"}
                    </button>
                  </td>
                </tr>
                {expanded ? <tr className="border-t border-border"><td colSpan={HEADERS.length}><AdminSubmissionBrowser audition={audition} onDeleted={onChanged} /></td></tr> : null}
              </Fragment>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

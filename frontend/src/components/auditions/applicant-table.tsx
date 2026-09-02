"use client";

import { useState } from "react";
import { ageText, genderText, mismatchDetailText } from "@/features/auditions/labels";
import { applicantEducationText } from "@/features/auditions/education-text";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";
import { useBoard } from "./board-context";
import { StatusBadge } from "./status-badge";

type PeekState = { applicant: Applicant; left: number; top: number };

const PEEK_WIDTH = 190;

export function ApplicantTable({
  rows,
  onPlayVideo,
}: {
  rows: readonly Applicant[];
  onPlayVideo: (applicant: Applicant) => void;
}) {
  const { board, selected, toggleSelected, openApplicant } = useBoard();
  const [peek, setPeek] = useState<PeekState | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-control border border-border bg-card">
          <thead>
            <tr>
              <th className="w-11 border-b border-border pl-1.5 text-left">
                <span className="sr-only">배우 선택</span>
              </th>
              {["배우", "신체", "학교", "제출 자료", "접수", "상태"].map((label, index) => (
                <th
                  key={label}
                  className={`whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-semibold tracking-[0.03em] text-muted ${
                    index >= 1 && index <= 4 ? "hidden lg:table-cell" : ""
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((applicant, index) => (
              <tr
                key={applicant.id}
                tabIndex={0}
                aria-label={`${applicant.name} 배우 상세 보기`}
                onClick={() => openApplicant(applicant.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openApplicant(applicant.id);
                  }
                }}
                className={`h-16 cursor-pointer transition-[background-color,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand last:[&>td]:border-b-0 ${
                  selected.has(applicant.id)
                    ? "bg-brand-soft shadow-[var(--shadow-row-selected)]"
                    : "hover:bg-surface active:bg-brand-soft"
                }`}
              >
                <td className="border-b border-border-soft pl-1.5 align-middle">
                  {/* 행 클릭은 상세 열기이므로 체크박스 영역에서는 전파를 막는다 */}
                  <label
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg py-3.5 pl-3 pr-2.5 hover:bg-foreground/5"
                  >
                    <span className="sr-only">{applicant.name} 선택</span>
                    <input
                      type="checkbox"
                      checked={selected.has(applicant.id)}
                      onChange={() => toggleSelected(applicant.id)}
                      className="m-0 block h-[18px] w-[18px] cursor-pointer accent-brand"
                    />
                  </label>
                </td>
                <td className="border-b border-border-soft px-3 py-2 align-middle">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full bg-border-soft"
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setPeek({
                          applicant,
                          left: Math.min(rect.right + 12, window.innerWidth - PEEK_WIDTH - 16),
                          top: Math.max(8, Math.min(rect.top - 70, window.innerHeight - 300)),
                        });
                      }}
                      onMouseLeave={() => setPeek(null)}
                    >
                      <ApplicantPhotoImage
                        photo={applicant.photos[0]}
                        alt=""
                        sizes="38px"
                        priority={index === 0}
                        className="object-cover object-[center_22%]"
                      />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-tight tracking-[-0.01em]">
                        {applicant.name}
                        {applicant.mismatchReasons.length > 0 ? (
                          <span className="ml-1 text-xs font-semibold text-fail">조건 불일치</span>
                        ) : null}
                      </span>
                      <span className="num block text-xs text-muted">
                        {genderText(applicant.gender)} · {ageText(applicant.age)}
                      </span>
                      {applicant.mismatchReasons.length > 0 ? (
                        <span className="block text-xs leading-5 font-medium text-fail">
                          {mismatchDetailText(applicant, board.role).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="num hidden border-b border-border-soft px-3 py-2 text-xs text-muted lg:table-cell">
                  {measurementSummary(applicant.height, applicant.weight)}
                </td>
                <td className="hidden border-b border-border-soft px-3 py-2 text-xs text-muted lg:table-cell">
                  {applicantEducationText(applicant)}
                </td>
                <td className="hidden border-b border-border-soft px-3 py-2 lg:table-cell">
                  <span className="num mr-1 inline-flex h-6 items-center rounded-lg border border-border bg-surface px-2 text-xs text-muted">
                    사진 {applicant.photos.length}
                  </span>
                  {applicant.videos.length > 0 ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPlayVideo(applicant);
                      }}
                      className="border-b border-brand-line text-xs text-brand hover:border-brand"
                    >
                      영상 {applicant.videos.length}개
                    </button>
                  ) : (
                    <span className="text-xs text-muted">영상 없음</span>
                  )}
                </td>
                <td title={applicant.submittedAt} className="num hidden border-b border-border-soft px-3 py-2 text-xs text-muted lg:table-cell">
                  {formatSubmittedAt(applicant.submittedAt)}
                </td>
                <td className="border-b border-border-soft px-3 py-2 align-middle">
                  <StatusBadge status={applicant.review.status} memo={applicant.review.memo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {peek ? (
        <div
          aria-hidden="true"
          style={{ left: peek.left, top: peek.top, width: PEEK_WIDTH }}
          className="pointer-events-none fixed z-80 hidden rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-tooltip)] lg:block"
        >
          <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[5px] bg-border-soft">
            <ApplicantPhotoImage
              photo={peek.applicant.photos[0]}
              alt=""
              sizes="190px"
              className="object-cover"
            />
          </span>
          <span className="block px-1 pb-0.5 pt-1.5 text-xs font-semibold">
            {peek.applicant.name}
          </span>
          <span className="num block px-1 pb-1 text-xs text-muted">
            {peek.applicant.roleName} · {measurementValue(peek.applicant.height, "cm")} · 사진 {peek.applicant.photos.length}장
          </span>
        </div>
      ) : null}
    </>
  );
}

function formatSubmittedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function measurementValue(value: number | null, unit: string) {
  return value === null ? "미수집" : `${value}${unit}`;
}

function measurementSummary(height: number | null, weight: number | null) {
  return `${measurementValue(height, "cm")} · ${measurementValue(weight, "kg")}`;
}

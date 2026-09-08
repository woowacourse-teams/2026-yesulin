"use client";

import { ageText, genderText, mismatchDetailText } from "@/features/auditions/labels";
import { applicantEducationText } from "@/features/auditions/education-text";
import { orderedCareersByRecency } from "@/features/auditions/featured-careers";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";
import { useBoard } from "./board-context";
import { StatusBadge } from "./status-badge";

export function ApplicantTable({ rows }: { rows: readonly Applicant[] }) {
  const { board, selected, toggleSelected, openApplicant } = useBoard();

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-control border border-border bg-card">
          <thead>
            <tr>
              <th className="w-11 border-b border-border pl-1.5 text-left">
                <span className="sr-only">배우 선택</span>
              </th>
              {["배우", "주요 경력", "학교 · 학과", "키", "성별 · 나이", "상태"].map((label) => (
                <th
                  key={label}
                  className={`${headerClassName(label)} whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-semibold tracking-[0.03em] text-muted`}
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
                    <span className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full bg-border-soft">
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
                <td className="hidden border-b border-border-soft px-3 py-2 text-xs text-muted 2xl:table-cell">
                  <CareerSummary applicant={applicant} />
                </td>
                <td className="hidden border-b border-border-soft px-3 py-2 text-xs text-muted xl:table-cell">
                  <span title={applicantEducationText(applicant)} className="block max-w-48 truncate">
                    {applicantEducationText(applicant)}
                  </span>
                </td>
                <td className="num border-b border-border-soft px-3 py-2 text-xs text-muted">
                  {measurementValue(applicant.height, "cm")}
                </td>
                <td className="num hidden border-b border-border-soft px-3 py-2 text-xs text-muted xl:table-cell">
                  {genderText(applicant.gender)} · {ageText(applicant.age)}
                </td>
                <td className="border-b border-border-soft px-3 py-2 align-middle">
                  <StatusBadge status={applicant.review.status} memo={applicant.review.memo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function headerClassName(label: string) {
  if (label === "주요 경력") return "hidden 2xl:table-cell";
  if (label === "학교 · 학과" || label === "성별 · 나이") return "hidden xl:table-cell";
  return "";
}

function measurementValue(value: number | null, unit: string) {
  return value === null ? "미수집" : `${value}${unit}`;
}

function CareerSummary({ applicant }: { applicant: Applicant }) {
  const careers = orderedCareersByRecency(applicant.career).slice(0, 2);
  if (careers.length === 0) return <span className="text-muted">경력 없음</span>;

  const fullText = careers.map((career) => `${career.year} ${career.title} · ${career.part}`).join(" / ");
  return (
    <span title={fullText} className="block max-w-64 truncate text-muted-strong">
      {fullText}
    </span>
  );
}

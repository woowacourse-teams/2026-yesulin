"use client";

import { useCallback, useState } from "react";
import { GENDER_LABELS, mismatchText } from "@/features/auditions/labels";
import { openPrintWindow } from "@/features/auditions/print";
import { useBoard } from "./board-context";
import { DetailGallery } from "./detail-gallery";
import { DetailProfile } from "./detail-profile";
import { DetailReview } from "./detail-review";
import { ModalShell } from "./modal-shell";
import { StatusBadge } from "./status-badge";
import { useToast } from "./toast";
import { VideoModal } from "./video-modal";

const TITLE_ID = "applicant-detail-title";
const POPUP_BLOCKED = "팝업이 차단되어 인쇄 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.";

export function ApplicantDetail() {
  const { board, openedApplicantId, openApplicant } = useBoard();
  const [videoOpen, setVideoOpen] = useState(false);
  const toast = useToast();
  const close = useCallback(() => openApplicant(null), [openApplicant]);

  const applicant = board.applicants.find((candidate) => candidate.id === openedApplicantId);
  if (!applicant) return null;

  return (
    <>
      <ModalShell
        open
        onClose={close}
        labelledBy={TITLE_ID}
        className="flex h-[min(860px,92vh)] w-[min(1120px,94vw)] flex-col overflow-hidden rounded-modal bg-card shadow-[var(--shadow-modal)]"
      >
        <header className="glass-surface flex items-center gap-3.5 border-b border-border px-5 pb-3.5 pt-4">
          <div className="min-w-0">
            <h2 id={TITLE_ID} className="text-[23px] font-bold leading-tight tracking-[-0.03em]">
              {applicant.name}
            </h2>
            <p className="mt-0.5 text-dense text-muted">
              <b className="font-semibold text-muted-strong">{applicant.roleName}</b> 지원 ·{" "}
              {GENDER_LABELS[applicant.gender]} 만 {applicant.age}세 · {applicant.height}cm /{" "}
              {applicant.weight}kg · {applicant.id}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {applicant.mismatchReasons.length > 0 ? (
              <span
                title={`배역 조건: ${board.role.description}`}
                className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-fail-bg px-2 text-xs font-semibold text-fail"
              >
                조건 불일치 ({mismatchText(applicant.mismatchReasons)})
              </span>
            ) : null}
            <StatusBadge status={applicant.review.status} memo={applicant.review.memo} />
            <button
              type="button"
              title="이 지원자 인쇄"
              aria-label="이 지원자 인쇄"
              onClick={() => {
                if (!openPrintWindow([applicant], board.performance)) {
                  toast(POPUP_BLOCKED, { type: "error" });
                }
              }}
              className="min-h-11 rounded-control px-3 py-1 text-sm text-muted transition-[background-color,color,transform] duration-150 hover:bg-border-soft hover:text-foreground active:scale-[0.97] lg:min-h-0 lg:px-2 lg:text-xs"
            >
              인쇄
            </button>
            <button
              type="button"
              aria-label="닫기"
              onClick={close}
              className="min-h-11 rounded-control px-3 py-1 text-sm text-muted transition-[background-color,color,transform] duration-150 hover:bg-border-soft hover:text-foreground active:scale-[0.97] lg:min-h-0 lg:px-2 lg:text-xs"
            >
              닫기
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(300px,392px)_1fr] lg:overflow-hidden">
          <DetailGallery applicant={applicant} onPlayVideo={() => setVideoOpen(true)} />
          <DetailProfile applicant={applicant} />
        </div>

        <DetailReview applicant={applicant} />
      </ModalShell>

      {videoOpen ? (
        <VideoModal key={applicant.id} applicant={applicant} onClose={() => setVideoOpen(false)} />
      ) : null}
    </>
  );
}

"use client";

import { createContext, use } from "react";
import type {
  Applicant,
  SubmissionId,
  ReviewStatus,
  RoundNumber,
  AuditionBoardResponse,
} from "@/features/auditions/types";
import type { AuditionFilters } from "@/features/auditions/filters";

export type BoardContextValue = {
  readonly board: AuditionBoardResponse;
  readonly filters: AuditionFilters;
  /** 필터를 통과한, 지금 목록에 보이는 배우. */
  readonly visible: readonly Applicant[];
  readonly selected: ReadonlySet<SubmissionId>;
  readonly saving: boolean;
  readonly screeningCompleted: boolean;
  readonly setFilters: (update: (current: AuditionFilters) => AuditionFilters) => void;
  readonly goToRound: (round: RoundNumber) => void;
  readonly toggleSelected: (id: SubmissionId) => void;
  readonly setSelection: (ids: readonly SubmissionId[], selected: boolean) => void;
  readonly clearSelection: () => void;
  /** 액션바에서 여러 명을 한 번에 처리한다. */
  readonly setStatus: (ids: readonly SubmissionId[], status: ReviewStatus) => Promise<void>;
  /** 상세에서 한 명을 처리하고, 검토 대기 모드면 다음 배우로 넘어간다. */
  readonly reviewCurrent: (id: SubmissionId, status: ReviewStatus) => Promise<void>;
  readonly patchReview: (
    id: SubmissionId,
    patch: { readonly memo?: string; readonly note?: string },
  ) => Promise<void>;
  readonly completeCurrentScreening: () => Promise<void>;
  readonly completionPrompt: "auto" | "manual" | null;
  readonly setCompletionPrompt: (prompt: "auto" | "manual" | null) => void;
  readonly openApplicant: (id: SubmissionId | null) => void;
  readonly openedApplicantId: SubmissionId | null;
  /** 연락처 모아보기 대상. null이면 모달이 닫힌 상태다. */
  readonly contactList: readonly Applicant[] | null;
  readonly openContacts: (list: readonly Applicant[]) => void;
  readonly closeContacts: () => void;
};

const BoardContext = createContext<BoardContextValue | null>(null);

export const BoardProvider = BoardContext;

export function useBoard() {
  const value = use(BoardContext);
  if (!value) throw new Error("useBoard는 심사 보드 안에서만 쓸 수 있습니다.");
  return value;
}

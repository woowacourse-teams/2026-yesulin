"use client";
import { createContext, use, type ReactNode } from "react";
import type { ReviewAction, ReviewInput } from "@/features/analytics/review-actions";
import type { Applicant, ReviewStatus, SubmissionId } from "@/features/pdf-reviews/screening-types";
import type { ReviewKey, ReviewRole } from "@/features/pdf-reviews/types";
import type { PdfFrameState } from "@/components/pdf-extractions/pdf-expandable-frame";
import type { LastDecision } from "./fullscreen-dock";
export type BoardContextValue = {
  reviewId: string;
  selected: ReadonlySet<SubmissionId>; saving: boolean; reviewLocked: boolean; saveError?: string;
  toggleSelected: (id: SubmissionId) => void; openApplicant: (id: SubmissionId) => void;
  roleOptions?: readonly ReviewRole[];
  currentRole?: (id: SubmissionId) => ReviewKey | null;
  changeRole?: (id: SubmissionId, roleId: string | null) => void;
  saveMemo?: (id: SubmissionId, memo: string) => Promise<string | null>;
  registerNavigationSave?: (flush: () => Promise<boolean>) => () => void;
  renderDocument?: (applicant: Applicant, frame: PdfFrameState) => ReactNode;
  requestNavigation?: (action: () => void) => void;
  onNoteDirty?: (dirty: boolean) => void;
  onApplicantOpened?: () => void;
  lastDecision: LastDecision | null;
  onLastDecisionChange: (last: LastDecision | null) => void;
  pagerSlot?: HTMLElement | null;
  onBasicAction?: (id: SubmissionId, action: ReviewAction, input?: ReviewInput) => void;
  reviewFocused: (id: SubmissionId, status: ReviewStatus, memo?: string, note?: string, revision?: number) => Promise<{ applicants: Applicant[] } | null>;
};
const Context = createContext<BoardContextValue | null>(null);
export const BoardProvider = Context;
export function useBoard() { const value = use(Context); if (!value) throw new Error("심사 화면 안에서 사용하세요."); return value; }

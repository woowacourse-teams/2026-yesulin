"use client";
import { createContext, use, type ReactNode } from "react";
import type { ReviewAction, ReviewInput } from "@/features/analytics/review-actions";
import type { Applicant, ReviewStatus, SubmissionId } from "@/features/pdf-reviews/screening-types";
import type { ReviewKey, ReviewRole } from "@/features/pdf-reviews/types";
import type { RoleSummary } from "@/features/auditions/types";
export type BoardContextValue = {
  source: { kind: "PDF" }; board: { role: RoleSummary }; filters: { work: "PENDING" | "DONE" };
  selected: ReadonlySet<SubmissionId>; saving: boolean; reviewLocked: boolean;
  toggleSelected: (id: SubmissionId) => void; openApplicant: (id: SubmissionId) => void;
  roleOptions?: readonly ReviewRole[];
  currentRole?: (id: SubmissionId) => ReviewKey | null;
  changeRole?: (id: SubmissionId, roleId: string | null) => void;
  renameTitle?: (id: SubmissionId, title: string) => Promise<boolean>;
  renderDocument?: (applicant: Applicant) => ReactNode;
  requestNavigation?: (action: () => void) => void;
  onNoteDirty?: (dirty: boolean) => void;
  onApplicantOpened?: () => void;
  onBasicAction?: (id: SubmissionId, action: ReviewAction, input?: ReviewInput) => void;
  reviewFocused: (id: SubmissionId, status: ReviewStatus, memo?: string, note?: string, revision?: number) => Promise<{ applicants: Applicant[] } | null>;
  patchReview: (id: SubmissionId, patch: { memo?: string; note?: string; revision?: number }) => Promise<void>;
};
const Context = createContext<BoardContextValue | null>(null);
export const BoardProvider = Context;
export function useBoard() { const value = use(Context); if (!value) throw new Error("심사 화면 안에서 사용하세요."); return value; }

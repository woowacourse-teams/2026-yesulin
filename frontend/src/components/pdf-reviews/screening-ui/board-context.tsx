"use client";
import { createContext, use, type ReactNode } from "react";
import type { Applicant, ReviewStatus, SubmissionId } from "@/features/pdf-reviews/screening-types";
import type { RoleSummary } from "@/features/auditions/types";
export type BoardContextValue = {
  source: { kind: "PDF" }; board: { role: RoleSummary }; filters: { work: "PENDING" | "DONE" };
  selected: ReadonlySet<SubmissionId>; saving: boolean; reviewLocked: boolean;
  toggleSelected: (id: SubmissionId) => void; openApplicant: (id: SubmissionId) => void;
  assignRoles?: (ids: readonly SubmissionId[]) => void;
  renderDocument?: (applicant: Applicant) => ReactNode;
  renderProfile?: (applicant: Applicant) => ReactNode;
  confirmNavigation?: () => boolean; requestNavigation?: (action: () => void) => void;
  onNoteDirty?: (dirty: boolean) => void;
  reviewFocused: (id: SubmissionId, status: ReviewStatus, memo?: string, note?: string, revision?: number) => Promise<{ applicants: Applicant[] } | null>;
  patchReview: (id: SubmissionId, patch: { memo?: string; note?: string; revision?: number }) => Promise<void>;
};
const Context = createContext<BoardContextValue | null>(null);
export const BoardProvider = Context;
export function useBoard() { const value = use(Context); if (!value) throw new Error("심사 화면 안에서 사용하세요."); return value; }

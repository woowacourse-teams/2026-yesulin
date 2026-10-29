// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screeningApplicant } from "@/features/pdf-reviews/screening-adapter";
import { ApplicantFocusReview } from "./applicant-focus-review";

const state = vi.hoisted(() => ({ board: {} }));
vi.mock('./board-context', () => ({ useBoard: () => state.board }));

afterEach(() => { vi.unstubAllGlobals(); });

describe('심사 키보드 조작', () => {
  it('브라우저 단축키와 키 반복으로 심사 결과를 저장하지 않는다', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const review = { id: 'review', title: 'synthetic', createdAt: '2026-10-29', roles: [], entries: [] };
    const entry = { id: 'entry', jobId: 'job', originalFilename: 'synthetic.pdf', applicantName: 'Synthetic',
      roleId: null, matchStatus: 'NEEDS_CHECK' as const, matchEvidence: null, memo: '', decision: 'PENDING' as const };
    const applicant = screeningApplicant(review, entry);
    const save = vi.fn().mockResolvedValue({ applicants: [applicant] });
    state.board = { board: { role: { id: review.id } }, source: { kind: 'PDF' }, filters: { work: 'PENDING' }, saving: false, reviewLocked: false,
      reviewFocused: save, patchReview: vi.fn(), openApplicant: vi.fn() };
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<ApplicantFocusReview rows={[applicant]} />));
      await act(async () => {
        for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'repeat']) {
          for (const key of ['a', 's', 'd']) window.dispatchEvent(new KeyboardEvent('keydown', { key, [modifier]: true }));
        }
      });
      expect(save).not.toHaveBeenCalled();
      await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' })); });
      expect(save).toHaveBeenCalledTimes(1);
      expect(save.mock.calls[0].slice(0, 2)).toEqual([applicant.id, 'ETC']);
      expect(document.activeElement).toBe(host.querySelector('section'));
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
});

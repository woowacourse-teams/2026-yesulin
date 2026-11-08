// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screeningApplicant } from "@/features/pdf-reviews/screening-adapter";
import { PdfExpandableFrame, type PdfFrameState } from "@/components/pdf-extractions/pdf-expandable-frame";
import { ApplicantFocusReview } from "./applicant-focus-review";

const state = vi.hoisted(() => ({ board: {} }));
vi.mock('./board-context', () => ({ useBoard: () => state.board }));

afterEach(() => { vi.unstubAllGlobals(); });

describe('심사 키보드 조작', () => {
  it('브라우저 단축키와 키 반복은 무시하고 한글 입력 상태에서도 키 자리로 판정한다', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const review = { id: 'review', title: 'synthetic', createdAt: '2026-10-29', roles: [], entries: [] };
    const entry = { id: 'entry', jobId: 'job', originalFilename: 'synthetic.pdf', applicantName: 'Synthetic',
      roleId: null, matchStatus: 'NEEDS_CHECK' as const, matchEvidence: null, memo: '', decision: 'PENDING' as const };
    const applicant = screeningApplicant(review, entry);
    const action = vi.fn();
    const save = vi.fn().mockResolvedValue({ applicants: [applicant] });
    state.board = { board: { role: { id: review.id } }, source: { kind: 'PDF' }, filters: { work: 'PENDING' }, saving: false, reviewLocked: false,
      onBasicAction: action, reviewFocused: save, patchReview: vi.fn(), openApplicant: vi.fn() };
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<ApplicantFocusReview rows={[applicant]} />));
      await act(async () => {
        for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'repeat']) {
          for (const code of ['KeyA', 'KeyS', 'KeyD']) window.dispatchEvent(new KeyboardEvent('keydown', { key: code.slice(3).toLowerCase(), code, [modifier]: true }));
        }
      });
      expect(save).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㄴ', code: 'KeyS' })); });
      expect(save).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledExactlyOnceWith(applicant.id, "decision_save", "shortcut");
      action.mockClear();
      await act(async () => root.render(<ApplicantFocusReview rows={[applicant]} />));
      expect(action).not.toHaveBeenCalled();
      const hold = [...host.querySelectorAll("button")].find(button => button.getAttribute("aria-label")?.startsWith("보류"));
      expect(hold).toBeTruthy();
      await act(async () => hold!.click());
      expect(action).toHaveBeenCalledExactlyOnceWith(applicant.id, "decision_save", "button");
      expect(save.mock.calls[0].slice(0, 2)).toEqual([applicant.id, 'ETC']);
      expect(document.activeElement).toBe(host.querySelector('section'));
    } finally { await act(async () => root.unmount()); host.remove(); }
  });

  it('원본 전체화면에서도 한글 입력 상태의 단축키로 넘기고 판정하며 전체화면과 초점을 유지한다', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const review = { id: 'review', title: 'synthetic', createdAt: '2026-10-29', roles: [], entries: [] };
    const entry = (id: string) => ({ id, jobId: `job-${id}`, originalFilename: 'synthetic.pdf', applicantName: `Synthetic ${id}`,
      roleId: null, matchStatus: 'NEEDS_CHECK' as const, matchEvidence: null, memo: '', decision: 'PENDING' as const });
    const first = screeningApplicant(review, entry('one'));
    const second = screeningApplicant(review, entry('two'));
    const save = vi.fn().mockResolvedValue({ applicants: [second] });
    const board = { board: { role: { id: review.id } }, source: { kind: 'PDF' }, filters: { work: 'PENDING' }, saving: false, reviewLocked: false,
      onBasicAction: vi.fn(), reviewFocused: save, openApplicant: vi.fn(), saveError: undefined as string | undefined,
      renderDocument: (applicant: typeof first, frame: PdfFrameState) => <PdfExpandableFrame key={applicant.id} {...frame}>{() => <p>원본 {applicant.id}</p>}</PdfExpandableFrame> };
    state.board = board;
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    const dialog = () => host.querySelector('[role="dialog"]');
    try {
      await act(async () => root.render(<ApplicantFocusReview rows={[first, second]} />));
      await act(async () => [...host.querySelectorAll('button')].find(item => item.textContent === '전체화면')!.click());
      expect(dialog()?.textContent).toContain('1 / 2');
      expect(dialog()?.textContent).toContain('미판정');
      await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㅜ', code: 'KeyN' })); });
      expect(dialog()?.textContent).toContain(`원본 ${second.id}`);
      expect(dialog()?.textContent).toContain('2 / 2');
      expect(document.activeElement).toBe(dialog());
      await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㅁ', code: 'KeyA' })); });
      expect(save.mock.calls[0].slice(0, 2)).toEqual([second.id, 'PASS']);
      expect(dialog()).not.toBeNull();
      const blocker = document.createElement('div'); blocker.setAttribute('role', 'dialog'); blocker.setAttribute('aria-modal', 'true'); document.body.append(blocker);
      await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD' })); });
      expect(save).toHaveBeenCalledTimes(1);
      blocker.remove();
      state.board = { ...board, saveError: '네트워크 오류' };
      await act(async () => root.render(<ApplicantFocusReview rows={[first, second]} />));
      expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('네트워크 오류');
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
});

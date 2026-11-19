// @vitest-environment jsdom
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScreeningBoard } from "./screening-board";
import type { LastDecision } from "./screening-ui/fullscreen-dock";
import type { ReviewDetail, ReviewEntry } from "@/features/pdf-reviews/types";
const mocks = vi.hoisted(() => ({ save: vi.fn(), role: vi.fn(), extraction: vi.fn(), dirty: vi.fn() }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock('./review-original-document', () => ({ ReviewOriginalDocument: ({ jobId }: { jobId: string }) => <div data-job-id={jobId}>원본 PDF</div> }));
vi.mock('@/features/analytics/product-analytics', () => ({ trackProductEvent: vi.fn() }));
vi.mock('@/features/pdf-extractions/api', () => ({ fetchPdfExtraction: mocks.extraction }));
vi.mock('@/features/pdf-reviews/api', () => ({ updatePdfReviewEntry: mocks.save, assignPdfReviewRoles: mocks.role, isUnauthorized: (e: { status?: number }) => e?.status === 401 }));
let host: HTMLDivElement, root: Root;
const entries: ReviewEntry[] = ['a','b'].map(id => ({ id, jobId: `job-${id}`, originalFilename: `${id}.pdf`, applicantName: null, roleId: null, matchStatus: 'WAITING', memo: '', matchEvidence: null, decision: 'PENDING', processingStatus: 'FAILED' }));
function Harness({ initialFocus = 'a' }: { initialFocus?: string | null }) {
  const [rows, setRows] = useState(entries);
  const [focusedId, setFocusedId] = useState(initialFocus);
  const [lastDecision, setLastDecision] = useState<LastDecision | null>(null);
  const navigating = useRef(false);
  const guarded = (action: () => void) => { if (navigating.current) return; navigating.current = true; action(); navigating.current = false; };
  const review: ReviewDetail = { id: 'review', title: '검증', createdAt: '2026-11-05', roles: [{ id: 'lead', name: '주연' }], entries: rows };
  return <><button onClick={() => setFocusedId(null)}>목록 복귀</button><ScreeningBoard review={review} entries={rows.filter(r => r.decision === 'PENDING')} decision="PENDING" focusedId={focusedId} onFocusChange={setFocusedId} lastDecision={lastDecision} onLastDecisionChange={setLastDecision} refreshKey={0} onSaved={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))} onDirtyChange={mocks.dirty} onUnauthorized={() => {}} navigate={guarded} /></>;
}
async function button(name: string) { const target = [...host.querySelectorAll('button')].find(b => b.getAttribute("aria-label") === name || b.getAttribute("aria-label")?.startsWith(`${name} (`) || b.textContent === name || b.textContent === `${name} →`)!; expect(target).toBeDefined(); await act(async () => target.click()); }
async function memo(text: string) { const field = host.querySelector('textarea')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,text); field.dispatchEvent(new Event('input',{ bubbles:true })); }); }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); vi.clearAllMocks(); host=document.createElement('div');document.body.append(host);root=createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it('카드 목록은 프로필을 선조회하지 않고 추출 실패여도 상세에서 원본을 표시한다', async () => {
  await act(async () => root.render(<Harness initialFocus={null} />));
  expect(host.querySelector('[data-job-id]')).toBeNull();
  expect(mocks.extraction).not.toHaveBeenCalled();
  await button('지원서 열기: a.pdf');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-a');
  expect(host.textContent).not.toMatch(/사진을 자동으로|경력/);
});
it('메모 저장 실패는 이동을 막고 재시도한 뒤에만 다음 지원서로 간다', async () => {
  mocks.save.mockRejectedValueOnce(new Error('network')).mockImplementation(async (_review,id,change)=>({...entries[0],id,...change}));
  await act(async () => root.render(<Harness />)); await memo('확인할 내용'); await button('다음 지원서');
  expect(host.textContent).toContain('저장하지 못했어요'); expect(host.querySelector('textarea')?.value).toBe('확인할 내용');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-a');
  await button('다음 지원서');
  expect(mocks.save).toHaveBeenLastCalledWith('review','a',{ decision:'PENDING',memo:'확인할 내용' },'memo');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-b');
});
it('판정하기 전에 메모 저장을 완료하고 판정과 함께 다음 지원서로 간다', async () => {
  mocks.save.mockImplementation(async (_review,id,change)=>({...entries[0],id,...change}));
  await act(async () => root.render(<Harness />)); await memo('작성 중'); await button('합격');
  expect(mocks.save.mock.calls.map(call => call[3])).toEqual(['memo','decision']);
  expect(mocks.save).toHaveBeenLastCalledWith('review','a',{ decision:'PASS',memo:'작성 중' },'decision');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-b');
});
it('배역 저장 실패는 기존 값을 유지하고 다시 선택해서 저장할 수 있다', async () => {
  mocks.role.mockRejectedValueOnce(new Error('배역 실패')).mockResolvedValueOnce([{...entries[0],roleId:'lead',matchStatus:'MATCHED'}]);
  await act(async () => root.render(<Harness />));
  for(let i=0;i<2;i++) {
    await act(async () => host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
    await act(async () => [...host.querySelectorAll<HTMLElement>('[role="option"]')].find(e=>e.textContent?.includes('주연'))!.click());
    expect(host.querySelector('textarea')?.value).toBe('');
    if(i===0) {expect(host.textContent).toContain('배역 실패');expect(host.querySelector('[role="combobox"]')?.textContent).toContain('미배정');}
  }
  expect(host.querySelector('[role="combobox"]')?.textContent).toContain('주연');
});

it('상세 영역의 이름은 PDF 파일명을 사용하고 수동 저장·대기 복원 버튼은 표시하지 않는다', async () => {
  await act(async () => root.render(<Harness />));
  for (const text of ['메모 저장','대기로 되돌리기','원본 파일 ·','심사 기록','저장됨','저장 대기 중']) expect(host.textContent).not.toContain(text);
  expect(host.querySelector('[aria-label="배우 이름"]')).toBeNull();
  expect(host.querySelector('section')?.getAttribute('aria-label')).toBe('a.pdf, 지원자 1 / 2 심사');
});
it('판정 뒤 되돌리기 알림 없이 Z로 이전 판정에 다시 저장하고 그 지원서로 돌아간다', async () => {
  mocks.save.mockImplementation(async (_review,id,change)=>({...entries.find(entry=>entry.id===id)!,...change}));
  await act(async () => root.render(<Harness />)); await button('합격');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-b');
  expect(host.textContent).not.toContain('저장했어요');
  expect(host.querySelector('[aria-label="되돌리기 (Z)"]')).toBeNull();
  await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ' })); });
  expect(mocks.save).toHaveBeenLastCalledWith('review','a',{ decision:'PENDING',memo:'' },'decision');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-a');
});

it('Z 단축키로 직전 판정을 되돌리고 되돌린 뒤에는 다시 눌러도 저장하지 않는다', async () => {
  mocks.save.mockImplementation(async (_review,id,change)=>({...entries.find(entry=>entry.id===id)!,...change}));
  await act(async () => root.render(<Harness />));
  await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' })); });
  expect(mocks.save).toHaveBeenLastCalledWith('review','a',{ decision:'FAIL',memo:'' },'decision');
  await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㅋ', code: 'KeyZ' })); });
  expect(mocks.save).toHaveBeenLastCalledWith('review','a',{ decision:'PENDING',memo:'' },'decision');
  const calls = mocks.save.mock.calls.length;
  await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ' })); });
  expect(mocks.save).toHaveBeenCalledTimes(calls);
});

it('선택 체크박스는 상세를 열지 않고 파일명 버튼으로만 상세를 연다', async () => {
  await act(async () => root.render(<Harness initialFocus={null} />));
  const card = host.querySelector('article')!;
  await act(async () => card.querySelector<HTMLInputElement>('input')!.click());
  expect(host.querySelector('[data-job-id]')).toBeNull();
  expect(card.querySelector<HTMLInputElement>('input')!.checked).toBe(true);
  expect(card.textContent).not.toMatch(/상세보기|PDF/);
  expect(card.querySelectorAll('button')).toHaveLength(1);
  await button('지원서 열기: a.pdf');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-a');
});

it.each(['검토 메모', '', '   '])('메모 %j의 존재를 판정과 별도로 표시하며 서버 반영을 갱신한다', async note => {
  function CardHarness() {
    const [memo, setMemo] = useState('');
    const review: ReviewDetail = { id: 'review', title: '검증', createdAt: '2026-11-19', roles: [], entries: [{ ...entries[0], memo }] };
    return <><button onClick={() => setMemo(note)}>서버 메모 반영</button><ScreeningBoard review={review} entries={review.entries} decision="PENDING" focusedId={null} onFocusChange={() => {}} lastDecision={null} onLastDecisionChange={() => {}} refreshKey={0} onSaved={() => {}} onDirtyChange={() => {}} onUnauthorized={() => {}} navigate={action => action()} /></>;
  }
  await act(async () => root.render(<CardHarness />));
  expect(host.querySelector('article')?.textContent).toContain('메모 없음');
  await button('서버 메모 반영');
  let expected = '메모 없음';
  if (note.trim()) expected = '메모 있음';
  expect(host.querySelector('article')?.textContent).toContain(expected);
  expect(host.querySelector('article')?.textContent).toContain('미검토');
});

it('자동 저장한 메모의 추가와 삭제가 목록 복귀 후에도 즉시 반영된다', async () => {
  mocks.save.mockImplementation(async (_review,id,change)=>({...entries.find(entry=>entry.id===id)!,...change}));
  await act(async () => root.render(<Harness />));
  await memo('검토 메모'); await button('다음 지원서'); await button('목록 복귀');
  expect(host.querySelector('article')?.textContent).toContain('메모 있음');
  expect(host.querySelector('article')?.textContent).toContain('검토 메모');
  await button('지원서 열기: a.pdf');
  expect(host.querySelector('textarea')?.value).toBe('검토 메모');
  await memo(''); await button('다음 지원서'); await button('목록 복귀');
  expect(host.querySelector('article')?.textContent).toContain('메모 없음');
  expect(host.querySelector('article')?.textContent).not.toContain('검토 메모');
});

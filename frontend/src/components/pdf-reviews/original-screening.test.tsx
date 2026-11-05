// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScreeningBoard } from "./screening-board";
import type { ReviewDetail, ReviewEntry } from "@/features/pdf-reviews/types";
const mocks = vi.hoisted(() => ({ save: vi.fn(), role: vi.fn(), extraction: vi.fn(), rename: vi.fn(), dirty: vi.fn() }));
vi.mock('./review-original-document', () => ({ ReviewOriginalDocument: ({ jobId }: { jobId: string }) => <div data-job-id={jobId}>원본 PDF</div> }));
vi.mock('@/features/analytics/product-analytics', () => ({ trackProductEvent: vi.fn() }));
vi.mock('@/features/pdf-extractions/api', () => ({ fetchPdfExtraction: mocks.extraction }));
vi.mock('@/features/pdf-reviews/api', () => ({ updatePdfReviewEntry: mocks.save, assignPdfReviewRoles: mocks.role, renamePdfReviewEntry: mocks.rename, isUnauthorized: (e: { status?: number }) => e?.status === 401 }));
let host: HTMLDivElement, root: Root;
const entries: ReviewEntry[] = ['a','b'].map(id => ({ id, jobId: `job-${id}`, originalFilename: `${id}.pdf`, applicantName: null, roleId: null, matchStatus: 'WAITING', memo: '', matchEvidence: null, decision: 'PENDING', processingStatus: 'FAILED' }));
function Harness({ navigate = (action: () => void) => action(), view = 'single', initialRows = entries, decision = 'PENDING' }: { navigate?: (action: () => void) => void; view?: 'single'|'card'|'table'; initialRows?: ReviewEntry[]; decision?: ReviewEntry['decision'] }) {
  const [rows, setRows] = useState(initialRows);
  const review: ReviewDetail = { id: 'review', title: '검증', createdAt: '2026-11-05', roles: [{ id: 'lead', name: '주연' }], entries: rows };
  return <ScreeningBoard review={review} entries={rows.filter(r => r.decision === decision)} decision={decision} view={view} refreshKey={0} onSaved={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))} onDirtyChange={mocks.dirty} onUnauthorized={() => {}} navigate={navigate} />;
}
async function button(name: string) { const target = [...host.querySelectorAll('button')].find(b => b.getAttribute("aria-label") === name || b.textContent === name || b.textContent === `${name} →`)!; expect(target).toBeDefined(); await act(async () => target.click()); }
async function memo(text: string) { const field = host.querySelector('textarea')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,text); field.dispatchEvent(new Event('input',{ bubbles:true })); }); }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); vi.clearAllMocks(); host=document.createElement('div');document.body.append(host);root=createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it('추출 실패/대기여도 원본을 표시하고 카드·표에서는 프로필을 선조회하지 않는다', async () => {
  for (const view of ['single','card','table'] as const) {
    await act(async () => root.render(<Harness key={view} view={view} />));
    expect(host.textContent).not.toContain('사진을 자동으로');
    expect(host.textContent).not.toContain('경력');
    if(view==='single') expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-a');
  }
  expect(mocks.extraction).not.toHaveBeenCalled();
});
it('판정 저장 실패는 메모·현재 원본을 유지하며 성공하면 함께 저장하고 다음 지원서로 간다', async () => {
  mocks.save.mockRejectedValueOnce(new Error('저장 실패')).mockImplementationOnce(async (_review,id,change)=>({...entries[0],id,...change}));
  await act(async () => root.render(<Harness />)); await memo('확인할 내용'); await button('합격');
  expect(host.textContent).toContain('저장 실패'); expect(host.querySelector('textarea')?.value).toBe('확인할 내용');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-a');
  await button('합격'); expect(mocks.save).toHaveBeenLastCalledWith('review','a',{ decision:'PASS',memo:'확인할 내용' },'decision');
  expect(host.querySelector('[data-job-id]')?.getAttribute('data-job-id')).toBe('job-b');
});
it('미저장 메모가 있으면 다음 이동과 배역 변경을 같은 이동 보호에 맡긴다', async () => {
  const navigate=vi.fn(); await act(async () => root.render(<Harness navigate={navigate} />)); await memo('작성 중');
  await button('다음 지원서'); expect(navigate).toHaveBeenCalledTimes(1); expect(mocks.save).not.toHaveBeenCalled();
  await act(async () => host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
  await act(async () => [...host.querySelectorAll<HTMLElement>('[role="option"]')].find(e=>e.textContent?.includes('주연'))!.click());
  expect(navigate).toHaveBeenCalledTimes(2); expect(mocks.role).not.toHaveBeenCalled();
  expect(host.querySelector('textarea')?.value).toBe('작성 중');
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

it('기존 판정을 대기로 되돌릴 때 저장된 메모를 보존한다', async () => {
  const passed: ReviewEntry = {...entries[0],decision:'PASS',memo:'저장된 메모'};
  mocks.save.mockImplementationOnce(async (_review,id,change)=>({...passed,id,...change}));
  await act(async () => root.render(<Harness initialRows={[passed]} decision="PASS" />));
  await button('대기로 되돌리기');
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith('review','a',{ decision:'PENDING',memo:'저장된 메모' },'decision');
});

it('제목 저장 실패는 초안을 유지하고 성공하면 원본 파일명과 메모를 보존한다', async () => {
  mocks.rename.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({...entries[0],title:'가람 배우 지원서'});
  await act(async () => root.render(<Harness />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="지원서 제목 수정"]')!.click());
  const input=host.querySelector<HTMLInputElement>('#review-document-title')!;
  await act(async () => {Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'가람 배우 지원서');input.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(mocks.dirty).toHaveBeenLastCalledWith(true);
  expect(host.querySelector<HTMLButtonElement>('[aria-label="합격"]')?.disabled).toBe(true);
  await button('제목 저장'); expect(host.textContent).toContain('제목을 저장하지 못했습니다'); expect(input.value).toBe('가람 배우 지원서');
  await button('제목 저장');
  expect(mocks.rename).toHaveBeenLastCalledWith('review','a','가람 배우 지원서');
  expect(host.querySelector('h2')?.textContent).toBe('가람 배우 지원서');expect(host.textContent).toContain('원본 파일 · a.pdf');
  expect(mocks.save).not.toHaveBeenCalled();
});
it('제목 입력 중 다음 지원서 이동도 보호하며 저장 성공 전에는 변경되지 않는다', async () => {
  const navigate=vi.fn();await act(async () => root.render(<Harness navigate={navigate} />));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="지원서 제목 수정"]')!.click());
  const input=host.querySelector<HTMLInputElement>('#review-document-title')!;
  await act(async () => {Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'작성 중 제목');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await button('다음 지원서');expect(navigate).toHaveBeenCalledOnce();expect(mocks.dirty).toHaveBeenLastCalledWith(true);
  expect(mocks.rename).not.toHaveBeenCalled();expect(input.value).toBe('작성 중 제목');
});

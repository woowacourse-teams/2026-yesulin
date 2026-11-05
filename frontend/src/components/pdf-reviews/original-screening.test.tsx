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

it('수동 저장·대기 복원·원본 파일명·설명 문구를 표시하지 않는다', async () => {
  await act(async () => root.render(<Harness />));
  for (const text of ['메모 저장','대기로 되돌리기','원본 파일 ·','심사 기록','저장됨','저장 대기 중']) expect(host.textContent).not.toContain(text);
  expect(host.querySelector<HTMLInputElement>('[aria-label="배우 이름"]')?.value).toBe('');
});
async function title(value: string) {
  const input=host.querySelector<HTMLInputElement>('[aria-label="배우 이름"]')!;
  await act(async () => {Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
  return input;
}
it('항상 편집 가능한 제목은 blur에 저장하고 실패 입력을 유지해 재시도한다', async () => {
  mocks.rename.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({...entries[0],title:'가람 배우 지원서'});
  await act(async () => root.render(<Harness />)); const input=await title('가람 배우 지원서');
  await act(async () => input.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));
  expect(host.textContent).toContain('저장하지 못했어요');expect(input.value).toBe('가람 배우 지원서');
  await button('저장 재시도');expect(mocks.rename).toHaveBeenLastCalledWith('review','a','가람 배우 지원서');
  expect(input.value).toBe('가람 배우 지원서');expect(host.querySelector('textarea')?.value).toBe('');
});
it('제목 저장이 완료될 때까지 다음 이동을 기다리고 제목·메모 응답을 필드별 병합한다', async () => {
  let resolve!: (entry: ReviewEntry) => void;
  mocks.rename.mockReturnValue(new Promise<ReviewEntry>(r=>{resolve=r;}));
  mocks.save.mockResolvedValue({...entries[0],memo:'최신 메모'});
  const navigate=vi.fn(); await act(async () => root.render(<Harness navigate={navigate} />));
  await title('최신 제목');await memo('최신 메모');await button('다음 지원서');expect(navigate).not.toHaveBeenCalled();
  await act(async()=>resolve({...entries[0],title:'최신 제목'}));
  expect(navigate).toHaveBeenCalledOnce();expect(host.querySelector<HTMLInputElement>('[aria-label="배우 이름"]')?.value).toBe('최신 제목');
  expect(host.querySelector('textarea')?.value).toBe('최신 메모');expect(mocks.dirty).toHaveBeenLastCalledWith(false);
});

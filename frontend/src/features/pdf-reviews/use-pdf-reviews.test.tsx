// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { usePdfReviews } from './use-pdf-reviews';
import { observeReviewProgress } from './api';
import type { ReviewDetail, ReviewEntry } from './types';
vi.mock('./api', () => ({ listPdfReviews: vi.fn().mockResolvedValue([]), fetchPdfReview: vi.fn(), isUnauthorized: vi.fn(), observeReviewProgress: vi.fn() }));
it('저장 성공 반영 직후 새 판정 현황을 관측한다', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const host=document.createElement('div'); const root=createRoot(host);
  let current: ReturnType<typeof usePdfReviews>;
  const unauthorized=vi.fn();
  function Probe(){ current=usePdfReviews({enabled:true,onUnauthorized:unauthorized});return null; }
  const entry={id:'entry',jobId:'job',decision:'PENDING'} as ReviewEntry;
  const detail={id:'review',title:'test',createdAt:'2026-10-31',roles:[],entries:[entry]} as ReviewDetail;
  try {
    await act(async()=>root.render(<StrictMode><Probe/></StrictMode>));
    await act(async()=>current.created(detail));
    expect(observeReviewProgress).toHaveBeenLastCalledWith(detail);
    await act(async()=>current.replaceEntry({...entry,decision:'HOLD'}));
    expect(observeReviewProgress).toHaveBeenLastCalledWith({...detail,entries:[{...entry,decision:'HOLD'}]});
    await act(async()=>current.replaceEntry({...entry,decision:'PASS'}));
    expect(observeReviewProgress).toHaveBeenLastCalledWith({...detail,entries:[{...entry,decision:'PASS'}]});
  } finally { await act(async()=>root.unmount());vi.unstubAllGlobals(); }
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { renamePdfReviewEntry, updatePdfReviewEntry } from './api';
vi.mock('@/features/analytics/product-analytics',()=>({trackProductEvent:vi.fn()}));
afterEach(()=>{document.cookie='XSRF-TOKEN=; Max-Age=0';vi.useRealTimers();vi.unstubAllGlobals();});
function stall() {
  const fetch=vi.fn((_url: string, options: RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(options.signal?.reason),{once:true})));
  vi.stubGlobal('fetch',fetch);return fetch;
}
it('CSRF 발급 요청부터 15초 제한을 적용하고 PATCH 전에 복구 가능한 오류를 반환한다',async()=>{
  vi.useFakeTimers();const fetch=stall();const request=renamePdfReviewEntry('review','entry','이름');const failed=expect(request).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(15000);await failed;expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][0]).toBe('/api/v1/sessions/current');
});
it('메모 PATCH가 멈춰도 15초에 중단해 재시도할 수 있다',async()=>{
  vi.useFakeTimers();document.cookie='XSRF-TOKEN=test';const fetch=stall();const request=updatePdfReviewEntry('r','e',{memo:'비공개',decision:'PENDING'},'memo');
  const failed=expect(request).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(15000);await failed;
  expect(fetch.mock.calls[0][0]).toBe('/api/v1/pdf-reviews/r/entries/e/memo');expect(fetch.mock.calls[0][1].signal?.aborted).toBe(true);
});

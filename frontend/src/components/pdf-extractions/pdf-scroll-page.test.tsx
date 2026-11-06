// @vitest-environment jsdom
import { act,createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { expect,it,vi } from 'vitest';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfQrDecoder } from './pdf-qr-decoder';
import { PdfScrollPage } from './pdf-scroll-page';
import { PdfRenderQueue } from './pdf-render-queue';
vi.mock('@/features/monitoring/report-error',()=>({reportError:vi.fn()}));
vi.mock('./pdf-page-links',()=>({PdfPageLinks:()=>null}));
it('metadata 종횡비 변경은 이전 완료 키를 버리고 새 canvas 완료 전에는 숨긴다',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('IntersectionObserver',class{constructor(readonly callback:(entries:{isIntersecting:boolean}[])=>void){}observe(){this.callback([{isIntersecting:true}]);}disconnect(){}});
  const tasks:(()=>void)[]=[];const doc={getPage:async()=>({getViewport:({scale}:{scale:number})=>({width:100*scale,height:140*scale}),render:()=>({promise:new Promise<void>(resolve=>tasks.push(resolve)),cancel:vi.fn()}),cleanup:vi.fn()})} as unknown as PDFDocumentProxy;
  const host=document.createElement('div');const root=createRoot(host);const reader=createRef<HTMLDivElement>();const queue=new PdfRenderQueue();const scanQueue=new PdfRenderQueue();
  async function render(width:number,height:number){await act(async()=>root.render(<PdfScrollPage document={doc} page={1} size={{width,height}} width={800} zoom={1} revision={1} reader={reader} queue={queue} scanQueue={scanQueue} decoder={{} as PdfQrDecoder} filename="test.pdf"/>));}
  try {
    await render(100,140);await act(async()=>tasks[0]());expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('false');
    await render(200,100);expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');expect(host.querySelector('[role="status"]')).not.toBeNull();
    await act(async()=>tasks[1]());expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('false');
  }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});

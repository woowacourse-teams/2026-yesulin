// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPageLinks } from "./pdf-page-links";
import { PdfRenderQueue } from "./pdf-render-queue";
import type { PdfQrDecoder } from "./pdf-qr-decoder";
let host: HTMLDivElement, root: Root;
let queue: PdfRenderQueue;
let scanQueue: PdfRenderQueue;
const decoder = { decode: vi.fn() };
const qr = { url:'https://example.test/qr',left:.6,top:.7,width:.1,height:.1,kind:'qr' as const };
let documentProxy: PDFDocumentProxy;
let finish: () => void;
let cancel: ReturnType<typeof vi.fn>;
const renderPage = vi.fn();
beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.clearAllMocks();
  queue=new PdfRenderQueue();scanQueue=new PdfRenderQueue();cancel=vi.fn(); renderPage.mockImplementation(()=>({promise:new Promise<void>(r=>{finish=r;}),cancel}));
  documentProxy={getPage:async()=>({getViewport:({scale}:{scale:number})=>({width:100*scale,height:140*scale,convertToViewportPoint:(x:number,y:number)=>[x,y]}),getAnnotations:async()=>[{subtype:'Link',url:'https://example.test/embedded',rect:[10,20,20,30]}],render:renderPage})} as unknown as PDFDocumentProxy;
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({getImageData:()=>({data:new Uint8ClampedArray(4),width:1,height:1})} as unknown as CanvasRenderingContext2D);
  decoder.decode.mockResolvedValue([qr]);host=document.createElement('div');root=createRoot(host);
});
afterEach(()=>{act(()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
async function render(visible=true) {await act(async()=>root.render(<PdfPageLinks document={documentProxy} page={1} visible={visible} queue={queue} scanQueue={scanQueue} decoder={decoder as unknown as PdfQrDecoder} />));await act(async()=>vi.advanceTimersByTimeAsync(0));}
it('내장 링크는 QR보다 먼저 표시하며 QR 영역도 비율로 배치하고 외부 페이지를 자동 열지 않는다',async()=>{
  await render();expect(host.querySelector('a')?.getAttribute('href')).toBe('https://example.test/embedded');
  await act(async()=>finish());expect(host.querySelectorAll('a')).toHaveLength(2);
  const link=host.querySelector<HTMLAnchorElement>('a[aria-label^="QR"]')!;expect(link.style.left).toBe('60%');expect(link.style.top).toBe('70%');
  expect(link.rel).toBe('noopener noreferrer');expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
  await render(false);expect(host.querySelector('a')).toBeNull();await render();expect(decoder.decode).toHaveBeenCalledTimes(1);
});
it('QR 검사 중 화면을 나가면 늦은 결과를 표시하지 않고 다음 진입에서 다시 검사한다',async()=>{
  await render();await render(false);expect(cancel).toHaveBeenCalled();await act(async()=>finish());expect(decoder.decode).not.toHaveBeenCalled();
  await render();await act(async()=>finish());expect(host.querySelector('a[aria-label^="QR"]')).not.toBeNull();
});
it('QR 실패가 내장 링크와 원본을 가리지 않는다',async()=>{
  decoder.decode.mockRejectedValueOnce(new Error('decoder offline'));await render();await act(async()=>finish());
  expect(host.querySelector('a')?.getAttribute('href')).toBe('https://example.test/embedded');
});

it('느린 QR 응답이 다음 원본 페이지 렌더 queue를 막지 않는다',async()=>{
  let resolve!: (value: typeof qr[])=>void;
  decoder.decode.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await render();await act(async()=>finish());
  const display=vi.fn(async()=>{});await queue.enqueue(display);expect(display).toHaveBeenCalledOnce();
  await act(async()=>resolve([qr]));
});

it('다른 페이지 QR이 응답하지 않아도 뒤 페이지 내장 링크는 즉시 표시한다',async()=>{
  let resolve!: (value: typeof qr[])=>void;decoder.decode.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
  await render();await act(async()=>finish());
  await act(async()=>root.render(<><PdfPageLinks document={documentProxy} page={1} visible queue={queue} scanQueue={scanQueue} decoder={decoder as unknown as PdfQrDecoder}/><PdfPageLinks document={documentProxy} page={2} visible queue={queue} scanQueue={scanQueue} decoder={decoder as unknown as PdfQrDecoder}/></>));
  expect(host.querySelectorAll('a[href="https://example.test/embedded"]')).toHaveLength(2);await act(async()=>resolve([qr]));
});

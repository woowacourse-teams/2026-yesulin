// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { PdfQrDecoder, type QrPixels } from './pdf-qr-decoder';
afterEach(()=>vi.useRealTimers());
it('ImageData prototype 접근자도 Worker에 명시적으로 전달하고 취소 시 종료한다',async()=>{
  const worker={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null,onerror:null};
  const decoder=new PdfQrDecoder(()=>worker as unknown as Worker);
  const data=new Uint8ClampedArray(16); const pixels=Object.create({data,width:2,height:2}) as QrPixels;
  const controller=new AbortController();const promise=decoder.decode(pixels,controller.signal);
  expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({data,width:2,height:2}),[data.buffer]);
  const rejected=expect(promise).rejects.toThrow('interrupted');controller.abort();await rejected;expect(worker.terminate).toHaveBeenCalledOnce();
});
it('응답 없는 QR Worker는 제한 시간 뒤 종료해 다음 스캔을 막지 않는다',async()=>{
  vi.useFakeTimers();const worker={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null,onerror:null};
  const next={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null as Worker["onmessage"],onerror:null};
  const created=[worker,next];
  const decoder=new PdfQrDecoder(()=>created.shift() as unknown as Worker);const promise=decoder.decode({data:new Uint8ClampedArray(4),width:1,height:1});
  const rejected=expect(promise).rejects.toThrow('interrupted');await vi.advanceTimersByTimeAsync(15000);await rejected;expect(worker.terminate).toHaveBeenCalledOnce();
  const second=decoder.decode({data:new Uint8ClampedArray(4),width:1,height:1});
  (next.onmessage as ((event:MessageEvent)=>void)|null)?.(new MessageEvent('message',{data:{links:[]}}));
  expect(await second).toEqual([]);expect(next.postMessage).toHaveBeenCalledOnce();decoder.dispose();
});

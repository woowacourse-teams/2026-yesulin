import type { DocumentLink } from "./pdf-document-links";
export type QrPixels = { readonly data: Uint8ClampedArray<ArrayBuffer>; readonly width: number; readonly height: number };
export class PdfQrDecoder {
  private worker: Worker | null = null;
  private cancel: (() => void) | null = null;
  constructor(private readonly create: () => Worker) {}
  decode(pixels: QrPixels, signal?: AbortSignal): Promise<DocumentLink[]> {
    if (signal?.aborted) return Promise.reject(new Error("QR scan interrupted"));
    this.worker ??= this.create();
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.dispose(), 15000);
      const finish = () => { clearTimeout(timer); this.cancel = null; signal?.removeEventListener("abort", this.dispose); worker.onmessage = null; worker.onerror = null; };
      this.cancel = () => { finish(); reject(new Error("QR scan interrupted")); };
      worker.onmessage = (event: MessageEvent<{ links: DocumentLink[]; failed?: boolean }>) => {
        finish(); if (event.data.failed) { reject(new Error("QR scan failed")); return; } resolve(event.data.links);
      };
      worker.onerror = () => this.dispose();
      signal?.addEventListener("abort", this.dispose, { once: true });
      try { worker.postMessage({ data: pixels.data, width: pixels.width, height: pixels.height, wasmUrl: new URL("/pdfjs/qr/zxing_reader.wasm", window.location.origin).href }, [pixels.data.buffer]); } catch { this.dispose(); }
    });
  }
  dispose = () => { this.worker?.terminate(); this.worker = null; this.cancel?.(); };
}

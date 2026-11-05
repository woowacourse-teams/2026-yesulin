import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { documentLink, type DocumentLink } from "./pdf-document-links";
import type { QrPixels } from "./pdf-qr-decoder";
const worker = self as unknown as { onmessage: ((event: MessageEvent<QrPixels & { wasmUrl: string }>) => void) | null; postMessage: (value: { links: DocumentLink[]; failed?: boolean }) => void };
async function scan(input: QrPixels & { wasmUrl: string }) {
  prepareZXingModule({ overrides: { locateFile: () => input.wasmUrl } });
  const source = new OffscreenCanvas(input.width, input.height);
  source.getContext("2d")!.putImageData(new ImageData(input.data, input.width, input.height), 0, 0);
  const links: DocumentLink[] = [];
  for (const side of [1600, 3000]) {
    const ratio = Math.min(1, side / Math.max(input.width, input.height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(input.width * ratio)), Math.max(1, Math.round(input.height * ratio)));
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    for (const channel of ["rgb", "blue"]) {
      if (channel === "blue") for (let i = 0; i < image.data.length; i += 4) image.data[i] = image.data[i + 1] = image.data[i + 2];
      const results = await readBarcodes(image, { formats: ["QRCode"], tryHarder: true, tryRotate: true, tryInvert: true, maxNumberOfSymbols: 16 });
      for (const result of results) {
        const points = Object.values(result.position);
        const rect = [Math.min(...points.map(p => p.x)), Math.min(...points.map(p => p.y)), Math.max(...points.map(p => p.x)), Math.max(...points.map(p => p.y))];
        const link = documentLink(result.text, rect, image.width, image.height, "qr");
        if (link && !links.some(existing => existing.url === link.url && Math.abs(existing.left - link.left) < .02 && Math.abs(existing.top - link.top) < .02)) links.push(link);
      }
    }
  }
  return links;
}
worker.onmessage = event => { void scan(event.data).then(links => worker.postMessage({ links })).catch(() => worker.postMessage({ links: [], failed: true })); };

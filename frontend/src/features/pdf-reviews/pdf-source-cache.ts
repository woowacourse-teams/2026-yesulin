import { useEffect, useState } from "react";
import { readPdfExtraction } from "../pdf-extractions/api";
import { reportPdfError } from "../pdf-extractions/report-pdf-error";
import type { PdfExtractionJob } from "../pdf-extractions/types";

export type PdfSource = { readonly url: string; readonly filename: string };
export type PdfSourceEntry = { readonly job: Promise<PdfExtractionJob>; readonly source: Promise<PdfSource> };
type Download = PdfSourceEntry & { readonly controller: AbortController };

const KEPT_DOCUMENTS = 3;

/** Keeps the last reviewed originals as in-memory Blob URLs. The signed S3 response itself stays no-store. */
export class PdfSourceCache {
  private readonly entries = new Map<string, Download>();

  open(jobId: string): PdfSourceEntry {
    const entry = this.entries.get(jobId) ?? this.download(jobId);
    this.entries.delete(jobId);
    this.entries.set(jobId, entry);
    this.evictOverflow();
    return entry;
  }

  prefetch(jobId: string) {
    if (this.entries.has(jobId)) return;
    void this.open(jobId).source.catch(() => {});
  }

  forget(jobId: string) {
    const entry = this.entries.get(jobId);
    this.entries.delete(jobId);
    if (!entry) return;
    entry.controller.abort();
    revoke(entry);
  }

  clear() {
    [...this.entries.keys()].forEach(jobId => this.forget(jobId));
  }

  private download(jobId: string): Download {
    const controller = new AbortController();
    const job = readPdfExtraction(jobId, true, controller.signal);
    const source = job.then(found => downloadOriginal(found, controller.signal));
    const entry: Download = { job, controller, source: source.then(downloaded => this.retain(jobId, entry, downloaded)) };
    entry.source.catch(() => this.drop(jobId, entry));
    return entry;
  }

  private retain(jobId: string, entry: Download, source: PdfSource) {
    if (this.entries.get(jobId) !== entry) URL.revokeObjectURL(source.url);
    return source;
  }

  private drop(jobId: string, entry: Download) {
    if (this.entries.get(jobId) === entry) this.entries.delete(jobId);
  }

  private evictOverflow() {
    for (const jobId of [...this.entries.keys()].slice(0, -KEPT_DOCUMENTS)) this.forget(jobId);
  }
}

/** One cache per mounted review surface; its Blob URLs are released when the surface unmounts. */
export function usePdfSourceCache() {
  const [cache] = useState(() => new PdfSourceCache());
  useEffect(() => () => cache.clear(), [cache]);
  return cache;
}

function revoke(entry: PdfSourceEntry) {
  entry.source.then(source => URL.revokeObjectURL(source.url), () => {});
}

async function downloadOriginal(job: PdfExtractionJob, signal: AbortSignal): Promise<PdfSource> {
  if (!job.sourceUrl) throw new Error("원본 PDF가 아직 준비되지 않았습니다.");
  const response = await fetch(job.sourceUrl, { cache: "no-store", credentials: "omit", signal }).catch(failedDownload);
  if (!response.ok) failedDownload(Object.assign(new Error("PDF source response"), { status: response.status }));
  const blob = await response.blob().catch(failedDownload);
  return { url: URL.createObjectURL(blob), filename: job.originalFilename };
}

/** Same monitoring as a PDF.js load failure; the reader sees one plain message instead of a browser network error. */
function failedDownload(cause: unknown): never {
  reportPdfError(cause, "load_document");
  throw new Error("원본 PDF를 불러오지 못했습니다.");
}

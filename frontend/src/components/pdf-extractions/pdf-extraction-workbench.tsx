"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { login } from "@/features/auth/session-api";
import { completePdfUpload, fetchPdfExtraction, PdfExtractionApiError, listPdfExtractions, preparePdfUpload, putPdf } from "@/features/pdf-extractions/api";
import { pdfStatusLabels, type PdfExtractionJob, type PreparedPdfUpload } from "@/features/pdf-extractions/types";
import { usePdfExtractionEvents } from "@/features/pdf-reviews/use-extraction-events";
import { PdfExtractionResultPanel } from "./pdf-extraction-result";

type Row = { id: string; name: string; size: number; job: PdfExtractionJob | null; phase: "SELECTED" | "UPLOADING" | "TRACKED" | "ERROR"; error: string; pendingJobId?: string };
const MAX_FILES = 800;
const MAX_BYTES = 25 * 1024 * 1024;
const message = (error: unknown) => error instanceof Error ? error.message : "처리하지 못했습니다. 다시 확인해 주세요.";
const summary = (job: PdfExtractionJob): PdfExtractionJob => ({ ...job, sourceUrl: null, result: null });
const isUploadUnconfirmed = (job: PdfExtractionJob) => job.status === "UPLOADING" || job.status === "UPLOAD_EXPIRED";
const eventsText = { CONNECTING: "자동 갱신에 연결하는 중…", CONNECTED: "추출이 끝나면 자동으로 갱신됩니다.", DISCONNECTED: "자동 갱신이 멈췄습니다. ‘목록 새로고침’으로 확인해 주세요." } as const;

function trackedRow(job: PdfExtractionJob): Row {
  const unconfirmed = isUploadUnconfirmed(job);
  return { id: job.jobId, name: job.originalFilename, size: job.size, job: summary(job), phase: unconfirmed ? "ERROR" : "TRACKED",
    pendingJobId: unconfirmed ? job.jobId : undefined,
    error: job.status === "UPLOAD_EXPIRED" ? "업로드 주소가 만료되었습니다. 이미 올라간 파일이 있으면 완료 확인으로 복구하고, 없으면 파일을 다시 선택해 주세요." : job.status === "UPLOADING" ? "업로드가 확인되지 않았습니다. 완료 확인을 다시 하거나 파일을 다시 선택해 주세요." : "" };
}

/** DB 목록을 jobId 기준으로 기존 행에 합친다. 고른 파일·업로드 중·실패 행은 목록에 없어도 잃지 않는다. */
function mergeJobs(current: Row[], jobs: PdfExtractionJob[]): Row[] {
  const byJobId = new Map(jobs.map(job => [job.jobId, job]));
  const known = new Set<string>();
  const merged = current.map((row): Row => {
    const jobId = row.job?.jobId ?? row.pendingJobId;
    const job = jobId ? byJobId.get(jobId) : undefined;
    if (!jobId || !job) return row;
    known.add(jobId);
    if (row.phase === "UPLOADING" || (row.phase === "ERROR" && isUploadUnconfirmed(job))) return row;
    return { ...row, job: summary(job), phase: "TRACKED", error: "", pendingJobId: undefined };
  });
  return [...merged, ...jobs.filter(job => !known.has(job.jobId)).map(trackedRow)];
}

export function PdfExtractionWorkbench({ local = false }: { readonly local?: boolean }) {
  const { session, setSession } = useAuthSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PdfExtractionJob | null>(null);
  const [detailError, setDetailError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const files = useRef(new Map<string, File>());
  const targets = useRef(new Map<string, PreparedPdfUpload["upload"]>());
  const input = useRef<HTMLInputElement>(null);
  const listSeq = useRef(0);
  const mounted = useRef(true);
  const [eventsKey, setEventsKey] = useState(0);
  const authorized = session?.role === "PRODUCER";
  const selectedJob = rows.find(row => row.id === selected)?.job;
  const detailId = selectedJob?.jobId;
  const detailStatus = selectedJob?.status;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // 목록 요청은 항상 하나만 유효하다. 늦게 도착한 오래된 응답은 버리고, 도착한 응답은 기존 행에 합친다.
  const loadList = useCallback(async () => {
    const seq = ++listSeq.current;
    try {
      const jobs = await listPdfExtractions();
      if (!mounted.current || seq !== listSeq.current) return;
      setRows(current => mergeJobs(current, jobs));
      setError("");
    } catch (cause) {
      if (mounted.current && seq === listSeq.current) setError(message(cause));
    } finally { if (mounted.current && seq === listSeq.current) setListLoading(false); }
  }, []);

  useEffect(() => { if (authorized) void loadList(); }, [authorized, loadList]);

  // 추출 완료 이벤트는 신호일 뿐이다. 연결·재연결·완료 때마다 DB 목록을 다시 읽어 누락을 복구한다.
  const eventsState = usePdfExtractionEvents({ enabled: authorized, reconnectKey: eventsKey, sync: loadList });

  function refreshList() {
    if (eventsState === "DISCONNECTED") setEventsKey(value => value + 1);
    void loadList();
  }

  useEffect(() => {
    if (!detailId) return;
    const controller = new AbortController();
    void fetchPdfExtraction(detailId, true, controller.signal)
      .then(job => { if (!controller.signal.aborted) { setDetail(job); setDetailError(""); } })
      .catch(cause => { if (!controller.signal.aborted) setDetailError(message(cause)); });
    return () => controller.abort();
  }, [detailId, detailStatus, refresh]);

  function choose(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    if (rows.length + selectedFiles.length > MAX_FILES) { setError("한 화면에서 최대 800개까지 확인할 수 있습니다."); return; }
    const next = Array.from(selectedFiles).map((file): Row => {
      const id = crypto.randomUUID();
      const valid = /\.pdf$/i.test(file.name) && file.size > 0 && file.size <= MAX_BYTES;
      if (valid) files.current.set(id, file);
      return { id, name: file.name, size: file.size, job: null, phase: valid ? "SELECTED" : "ERROR", error: valid ? "" : "25MiB 이하의 PDF 파일만 올릴 수 있습니다." };
    });
    setRows(current => [...current, ...next]); setError("");
    if (input.current) input.current.value = "";
  }

  async function uploadOne(row: Row) {
    setRows(current => current.map(item => item.id === row.id ? { ...item, phase: "UPLOADING", error: "" } : item));
    let pendingJobId = row.pendingJobId;
    const file = files.current.get(row.id);
    async function prepare(source: File) {
      const prepared = await preparePdfUpload(source);
      pendingJobId = prepared.jobId;
      targets.current.set(row.id, prepared.upload);
      setRows(current => current.map(item => item.id === row.id ? { ...item, pendingJobId: prepared.jobId } : item));
      return prepared;
    }
    try {
      let job: PdfExtractionJob | undefined;
      let upload: PreparedPdfUpload["upload"] | undefined;
      if (!pendingJobId) {
        if (!file) throw new Error("파일을 다시 선택해 주세요.");
        const prepared = await prepare(file);
        upload = prepared.upload;
      } else {
        // 재시도는 PUT 응답만 유실됐을 수 있으므로 기존 작업의 완료부터 확인한다.
        try { job = await completePdfUpload(pendingJobId); }
        catch (cause) {
          if (!(cause instanceof PdfExtractionApiError && cause.status === 409)) throw cause;
          if (!file) throw new Error("업로드된 원본을 찾지 못했습니다. 파일을 다시 선택해 주세요.");
          upload = targets.current.get(row.id);
          if (!upload || Date.parse(upload.expiresAt) <= Date.now()) upload = (await prepare(file)).upload;
        }
      }
      if (!job) {
        const jobId = pendingJobId!;
        try { await putPdf(file!, upload!); }
        catch (cause) {
          // PUT 응답만 유실됐을 수 있으므로 같은 작업의 완료를 확인한다. 원본을 덮어쓰지 않는다.
          try { job = await completePdfUpload(jobId); } catch { throw cause; }
        }
        job ??= await completePdfUpload(jobId);
      }
      files.current.delete(row.id);
      targets.current.delete(row.id);
      if (mounted.current) setRows(current => current.map(item => item.id === row.id ? { ...item, job: summary(job), phase: "TRACKED", error: "" } : item));
    } catch (cause) {
      if (mounted.current) setRows(current => current.map(item => item.id === row.id ? { ...item, phase: "ERROR", pendingJobId, error: message(cause) } : item));
    }
  }

  function isUploadable(row: Row) {
    return row.phase === "SELECTED" || (row.phase === "ERROR" && (!!row.pendingJobId || files.current.has(row.id)));
  }

  async function uploadAll() {
    if (busy) return;
    setBusy(true);
    const queue = rows.filter(isUploadable);
    let cursor = 0;
    async function run() { while (mounted.current && cursor < queue.length) { const row = queue[cursor++]; await uploadOne(row); } }
    await Promise.all([run(), run()]);
    if (mounted.current) setBusy(false);
  }

  async function localLogin() {
    setLoading(true); setError("");
    try {
      const current = await login("pdf-local@example.test", "PdfLocal123!");
      setSession({ credential: `member-${current.memberId}`, role: "PRODUCER", displayName: "로컬 공연사", producerStatus: "ACTIVE" });
      setRows(current => current.map(row => row.error === "로그인이 필요합니다." ? { ...row, error: "" } : row));
    } catch (cause) { setError(message(cause)); } finally { setLoading(false); }
  }

  const ready = rows.filter(isUploadable).length;
  const done = rows.filter(row => row.job?.status === "COMPLETED" || row.job?.status === "PARTIAL").length;
  return <div className="min-h-screen bg-surface px-5 py-8 text-foreground md:px-8">
    <div className="mx-auto max-w-[1440px]">
      <p className="mb-2 text-xs font-semibold tracking-wider text-brand">{local ? "LOCALSTACK · 로컬 전용" : "PDF 가져오기"}</p>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">PDF 추출 확인</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-strong">여러 지원서를 한 번에 선택하고 파일별 텍스트와 이미지를 확인하세요. OCR·AI 정보 정리·심사 결정은 포함하지 않습니다.</p>
      {local ? <p className="mt-3 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand">파일은 이 PC의 LocalStack에 업로드하고 Lambda 컨테이너에서 실제로 추출합니다. 실제 AWS 서비스와 연결하지 않습니다.</p> : null}
      {!authorized ? <section className="mt-6 rounded-card border border-border bg-card p-6"><h2 className="font-bold">공연사 로그인이 필요합니다</h2><p className="mt-2 text-sm text-muted-strong">본인이 올린 PDF와 추출 결과만 확인할 수 있습니다.</p>{local ? <button type="button" onClick={() => void localLogin()} disabled={loading} className="mt-5 min-h-12 rounded-control bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "로그인 중…" : "로컬 테스트 계정으로 시작"}</button> : <a href="/login" className="mt-5 inline-flex min-h-12 items-center font-semibold text-brand">로그인으로 이동</a>}</section> : <>
        <section aria-label="PDF 업로드" className="my-6 rounded-card border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className={`inline-flex min-h-12 cursor-pointer items-center rounded-control border border-brand-line px-5 text-sm font-semibold text-brand focus-within:outline-2 focus-within:outline-brand ${busy || listLoading ? "pointer-events-none opacity-50" : ""}`}>PDF 여러 개 선택<input ref={input} type="file" accept=".pdf,application/pdf" multiple disabled={busy || listLoading} onChange={event => choose(event.target.files)} className="sr-only" /></label>
            <button type="button" onClick={() => void uploadAll()} disabled={!ready || busy} className="min-h-12 rounded-control bg-brand px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? "업로드 중…" : `선택한 ${ready}개 업로드`}</button>
            {local ? <button type="button" onClick={() => void localLogin()} disabled={loading || busy} className="min-h-12 rounded-control border border-brand-line px-5 text-sm font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-40">{loading ? "로그인 중…" : "로컬 계정 다시 로그인"}</button> : null}
            <button type="button" onClick={refreshList} disabled={listLoading} className="min-h-12 rounded-control border border-brand-line px-5 text-sm font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-40">목록 새로고침</button>
            <p role="status" className="text-sm text-muted-strong">전체 {rows.length}개 · 추출 완료 {done}개</p>
            <p className="text-xs text-muted-strong">{eventsText[eventsState]}</p>
          </div><p className="mt-3 text-xs leading-6 text-muted">파일당 25MiB · 최대 800개 · 동시에 2개씩 업로드합니다. 한 파일이 실패해도 나머지는 계속 진행합니다.</p>
        </section>
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section aria-label="파일 목록" className="min-w-0 rounded-card border border-border bg-card p-4"><h2 className="mb-3 px-2 text-sm font-bold">업로드 파일</h2>
            {!rows.length ? <p className="p-4 text-sm leading-7 text-muted-strong">선택한 PDF가 없습니다. 여러 파일을 선택한 뒤 업로드해 주세요.</p> : <ul className="max-h-[740px] space-y-2 overflow-y-auto">{rows.map(row => <li key={row.id} className={`rounded-control border p-3 ${selected === row.id ? "border-brand bg-brand-soft" : "border-border"}`}>
              <button type="button" disabled={!row.job} aria-pressed={selected === row.id} onClick={() => { if (selected === row.id) return; setSelected(row.id); setDetail(null); setDetailError(""); }} className="min-h-11 w-full text-left disabled:cursor-default"><span className="block break-all text-sm font-semibold">{row.name}</span><span className="mt-1 block text-xs text-muted-strong">{(row.size / 1024 / 1024).toFixed(2)}MiB · {row.phase === "SELECTED" ? "업로드 전" : row.phase === "UPLOADING" ? "업로드 중" : row.phase === "ERROR" ? "업로드 확인 필요" : row.job ? pdfStatusLabels[row.job.status] : "확인 필요"}</span></button>
              {row.error ? <p role="alert" className="mt-2 break-words text-xs leading-6 text-fail">{row.error}</p> : null}
              {row.phase === "ERROR" && isUploadable(row) ? <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await uploadOne(row); } finally { setBusy(false); } }} className="min-h-11 text-xs font-semibold text-brand">{files.current.has(row.id) ? "업로드 다시 시도" : "업로드 완료 확인"}</button> : null}
              {row.phase === "ERROR" || row.phase === "SELECTED" ? <button type="button" disabled={busy} onClick={() => { files.current.delete(row.id); targets.current.delete(row.id); setRows(current => current.filter(item => item.id !== row.id)); }} className="ml-3 min-h-11 text-xs text-muted-strong">목록에서 제외</button> : null}
            </li>)}</ul>}
          </section>
          <div className="min-w-0">{selectedJob ? <button type="button" onClick={() => setRefresh(value => value + 1)} className="mb-3 min-h-11 text-sm font-semibold text-brand">선택한 결과 새로고침</button> : null}{detailError ? <div role="alert" className="mb-4 rounded-control border border-border bg-card p-4 text-sm text-fail">{detailError}<button type="button" onClick={() => setRefresh(value => value + 1)} className="ml-3 min-h-11 font-semibold text-brand">다시 확인</button></div> : null}
            {detail && detail.jobId === detailId ? <PdfExtractionResultPanel job={detail} /> : <div role="status" className="rounded-card border border-border bg-card p-8 text-sm leading-7 text-muted-strong">{selectedJob ? "선택한 PDF 결과를 불러오고 있습니다." : "업로드한 파일을 선택하면 원본 PDF와 추출 결과가 여기에 표시됩니다."}</div>}
          </div>
        </div>
      </>}
      {error ? <p role="alert" className="mt-5 rounded-control bg-fail-bg p-4 text-sm text-fail">{error}</p> : null}
    </div>
  </div>;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { completeAppointment, noticeInstructions, noticeTemplate, renderNoticeBody } from "@/features/auditions/notice-message";
import { noticeApi, noticeHistoryError, NOTICE_STATUS, type NoticeCommand, type NoticeDetail, type NoticeHistoryItem, type NoticeMetadata, type NoticePreview } from "@/features/auditions/notice-api";
import { useBoard } from "./board-context";
import { ModalShell, DialogHeader, DialogFooter } from "./modal-shell";
import { NoticeAppointmentField } from "./notice-appointment-field";
import { useNoticePreview } from "./use-notice-preview";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const inputClass = "min-h-11 w-full rounded-control border border-border bg-card px-3 py-2 text-sm";
const buttonClass = "min-h-11 rounded-control border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-40";

export function NoticePanel() {
  const { board, selected, source } = useBoard();
  const api = useMemo(() => noticeApi(board.role.id, board.round, source), [board.role.id, board.round, source]);
  const scopeKey = source.kind === "OTR" ? `OTR:${source.auditionId}:${source.roleOrder}` : board.role.id;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [metadata, setMetadata] = useState<NoticeMetadata | null>(null);
  const [command, setCommand] = useState<NoticeCommand | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [history, setHistory] = useState<NoticeHistoryItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [commonTime, setCommonTime] = useState("");
  const [retry, setRetry] = useState<{ batchId: string; ids: string[]; preview: NoticePreview } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [view, setView] = useState<"compose" | "history">("compose");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<NoticeCommand["recipients"][number] | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const lock = useRef(false);
  const live = useNoticePreview(api, command, open && view === "compose", previewRevision);
  const preview = retry?.preview ?? live.preview;
  const pending = history.some(h => h.pendingCount > 0 || h.unknownCount > 0);

  useEffect(() => {
    if (!open || view !== "history") return;
    let stopped = false;
    let loading = false;
    async function refresh() {
      if (stopped || loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const [items, current] = await Promise.all([api.history(), selectedBatchId ? api.detail(selectedBatchId) : null]);
        if (!stopped) {
          setHistory(items); setDetail(current); setHistoryLoaded(true); setRefreshError("");
          setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
        }
      } catch (cause) {
        if (!stopped) {
          setHistoryLoaded(false);
          setRefreshError(noticeHistoryError(cause));
        }
      } finally { loading = false; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), pending ? 3000 : 10000);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; if (timer) window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [api, open, view, selectedBatchId, pending]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "요청에 실패했습니다."); }
    finally { lock.current = false; setBusy(false); }
  }

  function change(next: NoticeCommand) {
    setPreviewRevision(v => v + 1);
    setCommand(next); setConfirmed(false); setRetry(null); attempt.current = null;
  }

  async function start(useSelected: boolean) {
    setView(useSelected ? "compose" : "history"); setCommonTime(""); setRefreshError("");
    setOpen(true); setInfo(""); setError(""); setDetail(null); setSelectedBatchId(null); setRetry(null);
    setCommand(null); setConfirmed(false); setRemoveId(null); setRemoved(null); setHistoryLoaded(false); setHistory([]); setLastUpdated(null);
    if (!useSelected) return;
    await run(async () => {
      const meta = await api.metadata();
      setMetadata(meta);
      const picked = board.applicants.filter(a => selected.has(a.id));
      if (!picked.length || picked.some(a => a.review.status !== "PASS")) throw new Error("현재 목록의 합격자만 선택해 주세요. 다른 상태의 지원자를 자동으로 제외하지 않습니다.");
      change({ targetStageId: meta.targetStageId, template: noticeTemplate(""),
        recipients: picked.map(a => ({ submissionId: a.id, appointment: null })) });
    });
  }

  async function send() {
    if (!preview || !confirmed || !preview.sendable || busy) return;
    await run(async () => {
      const signature = JSON.stringify({ command, retry: retry && { batchId: retry.batchId, ids: retry.ids }, token: preview.token });
      if (attempt.current?.signature !== signature) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature));
        const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
        const storageKey = `sms-attempt:${scopeKey}:${board.round}:${hash}`;
        const key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
        sessionStorage.setItem(storageKey, key);
        attempt.current = { signature, key };
      }
      const batch = retry ? await api.retry(retry.batchId, retry.ids, preview.token, attempt.current.key)
        : await api.send(command!, preview.token, attempt.current.key);
      setConfirmed(false); setCommand(null); setRetry(null); setView("history"); setSelectedBatchId(batch.id);
      setInfo("발송 요청이 접수됐습니다. 아래에서 실제 전달 결과를 자동으로 확인합니다.");
    });
  }

  const totals = history.reduce((sum, h) => ({ count: sum.count + h.batch.count, delivered: sum.delivered + h.deliveredCount,
    failed: sum.failed + h.failedCount, pending: sum.pending + h.pendingCount, unknown: sum.unknown + h.unknownCount,
    missing: sum.missing + h.batch.count - h.retainedCount }), { count: 0, delivered: 0, failed: 0, pending: 0, unknown: 0, missing: 0 });
  const rows = command && metadata ? command.recipients.map(r => {
    const candidate = metadata.candidates.find(c => c.submissionId === r.submissionId);
    const checked = preview?.recipients.find(c => c.submissionId === r.submissionId);
    return { ...r, name: candidate?.name ?? "이름 확인 필요", phone: candidate?.phone ?? "연락처 미수집",
      body: checked?.body ?? renderNoticeBody(command.template, candidate?.name ?? "이름 확인 필요", r.appointment, metadata.messageHeader, metadata.footer), error: checked?.error };
  }) : (preview?.recipients ?? []);

  return <div className="mb-3 flex flex-wrap gap-2">
    <button type="button" className={buttonClass} disabled={busy || selected.size === 0} onClick={() => void start(true)}>선택한 합격자에게 문자 보내기</button>
    <button type="button" className={buttonClass} disabled={busy} onClick={() => void start(false)}>발송 내역 확인</button>
    {open && <ModalShell open onClose={() => { if (!busy) setOpen(false); }} labelledBy="notice-title" className="flex max-h-[90dvh] w-[min(900px,95vw)] flex-col overflow-hidden rounded-modal bg-card shadow-xl">
      <DialogHeader id="notice-title" title={view === "history" ? "문자 발송 내역" : retry ? "실패한 문자 재발송 확인" : "합격 안내 문자 보내기"} subtitle={`${board.performance.title} / ${board.posting.title} / ${board.role.name} · ${board.round}차 합격자`} />
      <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-4 md:px-6">
        {error && <p role="alert" className="rounded-control bg-fail-bg p-3 text-sm text-fail">{error}</p>}
        {info && <p role="status" className="rounded-control bg-surface p-3 text-sm">{info}</p>}
        {busy && <p role="status">처리 중…</p>}
        {view === "compose" && command && metadata && <>
          {!metadata.enabled && <p className="text-sm text-fail">현재 문자 발송이 비활성화되어 있습니다. 미리보기만 가능합니다.</p>}
          <fieldset disabled={busy} className="min-w-0 space-y-4 disabled:opacity-60">
            <p className="text-sm text-muted">선택한 {command.recipients.length}명 · {metadata.targetName} · 한국 시간 기준</p>
            {command.recipients.length > 1 && <div className="space-y-2 rounded-control bg-surface p-3">
              <NoticeAppointmentField label={`선택한 ${command.recipients.length}명에게 안내할 기본 오디션 일시`} value={commonTime} onChange={setCommonTime} />
              <button type="button" className={buttonClass} disabled={!completeAppointment(commonTime)} onClick={() => { change({ ...command, recipients: command.recipients.map(r => ({ ...r, appointment: commonTime })) }); setInfo(`${command.recipients.length}명에게 일시를 적용했습니다. 아래에서 개인별로 변경할 수 있습니다.`); }}>선택한 {command.recipients.length}명에게 일시 적용</button>
            </div>}
            <div className="space-y-3">{command.recipients.map(r => {
              const candidate = metadata.candidates.find(a => a.submissionId === r.submissionId);
              return <div key={r.submissionId} className="space-y-3 rounded-control border border-border p-3">
                <p className="text-sm font-semibold">{candidate?.name ?? "현재 합격자 목록에 없음"} · {candidate?.phone ?? "연락처 미수집"}</p>
                <NoticeAppointmentField label={`${candidate?.name ?? "지원자"}님의 오디션 일시`} value={r.appointment} onChange={value => change({ ...command, recipients: command.recipients.map(item => item.submissionId === r.submissionId ? { ...item, appointment: value } : item) })} />
                {removeId === r.submissionId ? <div className="space-y-2 rounded-control bg-surface p-3 text-sm">
                  <p>{candidate?.name}님을 이번 문자 수신자에서 뺄까요? 합격 상태는 유지됩니다.</p>
                  <button type="button" className={buttonClass} onClick={() => setRemoveId(null)}>유지</button>{" "}
                  <button type="button" className={`${buttonClass} text-fail`} onClick={() => { setRemoved(r); change({ ...command, recipients: command.recipients.filter(item => item.submissionId !== r.submissionId) }); setRemoveId(null); }}>이번 발송에서 제외</button>
                </div> : <button type="button" className="min-h-11 text-sm text-muted underline underline-offset-4" onClick={() => setRemoveId(r.submissionId)}>이번 문자 수신자에서 제외</button>}
              </div>;
            })}</div>
            {removed && <div className="flex flex-wrap items-center gap-2 text-sm"><p>수신자 1명을 제외했습니다.</p><button type="button" className={buttonClass} onClick={() => { change({ ...command, recipients: [...command.recipients, removed] }); setRemoved(null); }}>제외 되돌리기</button></div>}
            <label className="block space-y-2 text-sm font-semibold"><span>추가 안내사항 (선택)</span><textarea rows={4} maxLength={2000 - noticeTemplate("").length - 2} className={inputClass} placeholder="예: 당일 자유연기 1분을 준비해주세요. 장소는 ○○ 연습실입니다." value={noticeInstructions(command.template) ?? ""} onChange={e => change({ ...command, template: noticeTemplate(e.target.value) })} /></label>
            <p className="text-sm text-muted">제작사·공고·이름·일시는 자동으로 들어갑니다. 장소와 준비사항만 작성해 주세요.</p>
          </fieldset>
        </>}
        {view === "compose" && (command || retry) && <section className="space-y-3 rounded-card border border-brand p-4" aria-label="최종 발송 메시지 미리보기">
          <h3 className="font-bold">최종 발송 메시지 미리보기 · {rows.length}명</h3>
          <p className="text-xs text-muted">입력한 내용이 바로 반영됩니다. 통신사·수신 앱에서 [Web발신] 등의 표시가 추가될 수 있습니다.</p>
          {!rows.length && <p className="text-sm">수신자가 없습니다. 제외를 되돌리거나 목록에서 합격자를 다시 선택해 주세요.</p>}
          {rows.map(r => <article key={r.submissionId} className="rounded-control bg-surface p-3">
            <p className="text-sm font-semibold">{r.name} · {r.phone}</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.body}</p>
            {r.error && <p className="mt-2 text-sm text-fail">{r.error}</p>}
          </article>)}
          <div className="space-y-1 border-t border-border pt-3 text-sm" role="status">
            {live.loading && !retry ? <p>발송 정보를 확인하고 있습니다…</p> : null}
            {!live.complete && !retry ? <p>모든 수신자의 날짜와 시간을 선택하면 문자 유형과 발송 건수가 표시됩니다.</p> : null}
            {live.error && !retry ? <div><p className="text-fail">{live.error}</p><button type="button" className={buttonClass} onClick={() => setPreviewRevision(v => v + 1)}>발송 정보 확인 재시도</button></div> : null}
            {preview && <>
              <p>예상 발송: SMS {preview.recipients.filter(r => r.type === "SMS").length}건 · LMS {preview.recipients.filter(r => r.type === "LMS").length}건</p>
              <p className="text-muted">발신번호: {preview.sender || "미설정"}</p>
              {preview.warnings.map(w => <p key={w} className="text-fail">{w}</p>)}
            </>}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={busy || !preview?.sendable} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />수신자·일시·최종 문구를 확인했습니다. 발송 후에는 취소할 수 없습니다.</label>
          <PrimaryButton disabled={busy || !confirmed || !preview?.sendable} onClick={() => void send()}>{rows.length}명에게 문자 발송</PrimaryButton>
        </section>}
        {view === "history" && <section className="space-y-3">
          {historyLoaded && <div className="rounded-control bg-surface p-3 text-sm">
            <p className="font-semibold">최근 {history.length}건 · 발송 대상 {totals.count}명 · 전달 성공 {totals.delivered}명 · 전달 실패 {totals.failed}명</p>
            {(totals.pending > 0 || totals.unknown > 0) && <p>전달 확인 중 {totals.pending}명 · 결과 확인 필요 {totals.unknown}명</p>}
            {totals.missing > 0 && <p>삭제·보관 만료로 상세 기록 없음 {totals.missing}명</p>}
          </div>}
          <p role="status" className="text-sm text-muted">발송 내역은 자동으로 갱신됩니다.{lastUpdated ? ` 마지막 확인: ${lastUpdated}` : ""}</p>
          {refreshError && <p role="status" className="text-sm text-fail">{refreshError}</p>}
          {!historyLoaded && !refreshError && <p role="status">발송 내역을 불러오는 중…</p>}
          {historyLoaded && !history.length && <p className="text-sm text-muted">아직 발송한 문자가 없습니다.</p>}
          {history.map(h => {
            const b = h.batch;
            const active = selectedBatchId === b.id;
            const current = detail?.batch.id === b.id ? detail : null;
            return <article key={b.id} className={`overflow-hidden rounded-control border ${active ? "border-brand" : "border-border"}`}>
              <button type="button" className="block min-h-11 w-full space-y-1 p-4 text-left hover:bg-surface" aria-expanded={active} aria-controls={`notice-detail-${b.id}`} onClick={() => { setSelectedBatchId(active ? null : b.id); setRefreshError(""); }}>
                <span className="block text-xs text-muted">{new Date(b.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}{b.retryOf ? " · 재발송" : ""}</span>
                <span className="block font-semibold">{h.firstRecipientName ? `${h.firstRecipientName}${h.retainedCount > 1 ? ` 외 ${h.retainedCount - 1}명` : ""}` : "수신자 기록 없음"}</span>
                <span className="block text-sm">{b.count}명 발송 · {h.deliveredCount}명 성공 · {h.failedCount}명 실패{h.pendingCount ? ` · ${h.pendingCount}명 확인 중` : ""}{h.unknownCount ? ` · ${h.unknownCount}명 결과 확인 필요` : ""}</span>
                {h.messageType && <span className="block text-sm text-muted">{h.messageType}</span>}
              </button>
              {active && <div id={`notice-detail-${b.id}`} className="space-y-3 border-t border-border p-4">
                {!current ? <p role="status">선택한 발송 건을 불러오는 중…</p> : <>
                  {b.count > current.deliveries.length && <p className="text-sm text-muted">일부 또는 전체 수신자 기록이 삭제·보관 만료되었습니다. 전달 성공이나 실패로 집계하지 않습니다.</p>}
                  {current.deliveries.map(d => <div key={d.id} className="space-y-1 rounded-control bg-surface p-3 text-sm">
                    <p className="font-semibold">{d.name} · {NOTICE_STATUS[d.status] ?? "결과 확인 필요"}</p>
                    <p>{d.phone}</p>
                    {d.status === "UNKNOWN" && !d.providerId && <p className="text-fail">업체 접수 여부를 확인하지 못했습니다. 중복 발송 방지를 위해 자동 재발송하지 않습니다. 솔라피 콘솔에서 발송 내역과 API 키의 허용 IP를 확인해 주세요.</p>}
                    {d.code === "SOLAPI_HTTP_403" && <p className="text-fail">솔라피가 접근을 거절했습니다. API 키의 허용 IP와 권한을 확인한 뒤 재발송해 주세요.</p>}
                    {d.code === "SOLAPI_HTTP_401" && <p className="text-fail">솔라피 인증에 실패했습니다. 서버의 API 키와 Secret 설정을 확인해 주세요.</p>}
                    {d.status === "FAILED" && <p className="text-fail">{d.code === "RETRIED" ? "재발송 요청됨" : `실패 코드: ${d.code ?? "업체 상세 사유 미제공"}`}</p>}
                    <details><summary className="cursor-pointer py-2">발송한 본문 보기</summary><p className="whitespace-pre-wrap break-words">{d.body}</p></details>
                  </div>)}
                  {current.deliveries.some(d => d.status === "FAILED" && d.code !== "RETRIED") && <button type="button" className={buttonClass} disabled={busy} onClick={() => void run(async () => {
                    const ids = current.deliveries.filter(d => d.status === "FAILED" && d.code !== "RETRIED").map(d => d.id);
                    const next = await api.retryPreview(b.id, ids);
                    setRetry({ batchId: b.id, ids, preview: next }); setCommand(null); setConfirmed(false); setInfo(""); setView("compose");
                  })}>실패한 수신자 재발송 확인</button>}
                </>}
              </div>}
            </article>;
          })}
        </section>}
        <p className="text-xs text-muted">전화번호·본문은 30일 후 삭제됩니다. 지원서를 삭제하면 관련 개인정보도 정리됩니다.</p>
      </div>
      <DialogFooter><SecondaryButton disabled={busy} onClick={() => setOpen(false)}>닫기</SecondaryButton></DialogFooter>
    </ModalShell>}
  </div>;
}

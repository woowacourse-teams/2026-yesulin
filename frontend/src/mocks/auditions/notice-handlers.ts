import { http, HttpResponse, passthrough } from "msw";
import type { NoticeBatch, NoticeCommand, NoticeDetail, NoticeDraft, NoticeHistoryItem, NoticePreview } from "@/features/auditions/notice-api";
import type { RoundNumber } from "@/features/auditions/types";
import { buildBoard } from "./screening-handlers";
import { otrNoticeAudience } from "../otr-audition-handlers";
import { frontendEnvironment } from "@/config/environment";
import { renderNoticeBody } from "@/features/auditions/notice-message";

const drafts = new Map<string, NoticeDraft>();
const batches = new Map<string, NoticeDetail[]>();
const keys = new Map<string, { body: string; batch: NoticeBatch }>();
const footer = "문의: 01000000000";
const renderBody = (template: string, name: string, appointment: string, header: string) =>
  renderNoticeBody(template, name, appointment, header, footer);
const error = (message: string) => HttpResponse.json({ code: "SMS_CONFLICT", message, detail: null }, { status: 409 });
const route = /\/api\/v1\/(?:audition-roles\/([^/]+)|otr-auditions\/([^/]+)\/roles\/(\d+))\/screening-rounds\/(\d+)\/(sms-(?:settings|draft|previews|batches)(?:\/.*)?)$/;

export const noticeHandlers = [http.all(route, async ({ request }) => {
  const match = new URL(request.url).pathname.match(route)!;
  const [, standardRole, otrId, roleOrder, roundText, resource] = match;
  if (otrId ? frontendEnvironment.producerApiEnabled : /^[1-9]\d*$/.test(standardRole)) return passthrough();
  const board = otrId ? otrNoticeAudience(otrId, roleOrder, roundText)
    : buildBoard(standardRole, Number(roundText) as RoundNumber);
  if (!board) return HttpResponse.json({ code: "SMS_NOT_FOUND", message: "공고·배역을 찾을 수 없습니다." }, { status: 404 });
  const scope = otrId ? `OTR:${otrId}:${roleOrder}:${roundText}` : `${standardRole}:${roundText}`;
  const history = batches.get(scope) ?? [];
  const candidates = board.applicants.filter(a => a.review.status === "PASS");
  const messageHeader = `안녕하세요, 목 공연사입니다.\n{이름}님께서 '${board.posting.title}' 오디션 대상자로 선정되셨습니다.`;
  if (resource === "sms-settings") return HttpResponse.json({ enabled: true, sender: "0200000000", footer, messageHeader, targetStageId: null, targetName: "목 오디션 일정", targetDate: null, requestLimit: 500,
    candidates: candidates.map(a => ({ submissionId: a.id, name: a.name, phone: a.phone })) });
  if (resource === "sms-draft" && request.method === "GET") return HttpResponse.json(drafts.get(scope) ?? { version: 0, command: null });
  if (resource === "sms-draft") {
    const body = await request.json() as NoticeDraft;
    if ((drafts.get(scope)?.version ?? 0) !== body.version) return error("다른 창에서 초안이 변경됐습니다.");
    const saved = { version: body.version + 1, command: body.command };
    drafts.set(scope, saved); return HttpResponse.json(saved);
  }
  if (resource === "sms-previews") {
    const command = await request.json() as NoticeCommand;
    const recipients = command.recipients.map(r => {
      const a = candidates.find(a => a.id === r.submissionId);
      const invalid = !a || !r.appointment || !command.template.includes("{오디션일시}");
      return { ...r, name: a?.name ?? null, phone: a?.phone ?? null, body: renderBody(command.template, a?.name ?? "", r.appointment ?? "", messageHeader), type: "LMS", bytes: 100, price: 30, error: invalid ? "합격자·일시·치환 변수를 확인해 주세요." : null };
    });
    return HttpResponse.json({ recipients, warnings: ["목 모드: 화면 확인용 데이터이며 실제 문자는 발송되지 않습니다."], total: recipients.length * 30, sender: "0200000000", token: JSON.stringify(command), sendable: recipients.every(r => !r.error) } satisfies NoticePreview);
  }
  if (resource === "sms-batches" && request.method === "GET") return HttpResponse.json(history.map(h => ({
    batch: h.batch, firstRecipientName: h.deliveries[0]?.name ?? null, retainedCount: h.deliveries.length,
    deliveredCount: h.deliveries.filter(d => d.status === "DELIVERED").length,
    failedCount: h.deliveries.filter(d => d.status === "FAILED").length,
    pendingCount: h.deliveries.filter(d => ["QUEUED", "SENDING", "ACCEPTED"].includes(d.status)).length,
    unknownCount: h.deliveries.filter(d => d.status === "UNKNOWN").length, messageType: "LMS",
  } satisfies NoticeHistoryItem)));
  if (resource === "sms-batches") {
    const body = await request.json() as { command: NoticeCommand; previewToken: string };
    const key = scope + request.headers.get("Idempotency-Key");
    const existing = keys.get(key);
    if (existing) return existing.body === JSON.stringify(body) ? HttpResponse.json(existing.batch, { status: 202 }) : error("같은 발송 키로 다른 내용을 보낼 수 없습니다.");
    if (body.command.template.includes("[잔액부족]")) return error("[목 시나리오] 잔액이 부족합니다.");
    if (body.previewToken !== JSON.stringify(body.command)) return error("다시 미리보기해 주세요.");
    const batch: NoticeBatch = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), count: body.command.recipients.length, estimatedCost: body.command.recipients.length * 30, retryOf: null };
    const deliveries = body.command.recipients.map((r, i) => ({ id: crypto.randomUUID(), name: candidates.find(a => a.id === r.submissionId)?.name ?? "목 지원자", phone: "01000000000", body: renderBody(body.command.template, candidates.find(a => a.id === r.submissionId)?.name ?? "", r.appointment ?? "", messageHeader), appointment: r.appointment ?? "", status: ["DELIVERED", "FAILED", "UNKNOWN"][i % 3], code: "MOCK", providerId: null }));
    batches.set(scope, [{ batch, deliveries }, ...history]); drafts.delete(scope); keys.set(key, { body: JSON.stringify(body), batch });
    return HttpResponse.json(batch, { status: 202 });
  }
  const id = resource.split("/")[1];
  const detail = history.find(h => h.batch.id === id);
  if (resource.endsWith("/retries") || resource.endsWith("/retry-preview")) return error("목 모드의 재발송은 지원하지 않습니다. 실제 API + Fake 통합 테스트로 검증합니다.");
  return detail ? HttpResponse.json(detail) : error("발송 내역을 찾을 수 없습니다.");
})];

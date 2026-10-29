"use client";

import { useEffect, useId, useState } from "react";
import { AdminApiError, connectEventBusinessCard, connectEventBusinessCardMember, disconnectEventBusinessCardMember } from "@/features/admin/api";
import type { AdminEventBusinessCard, AdminEventRegistration } from "@/features/admin/types";
import { businessCardProfileUrlProblem, registeredBusinessCardDraft } from "@/features/events/business-card";
import { EventBusinessCardPreview, type CardPreviewSide } from "@/components/events/event-business-card-preview";
import { AdminActionButton } from "./admin-shell";

/** 저장한 신청의 고정 QR을 내려받고, 목적지·회원 연결을 관리한다. */
export function AdminEventBusinessCardPanel({ eventId, registration, card, onSaved, onUnauthorized }: {
  readonly eventId: number;
  readonly registration: AdminEventRegistration;
  readonly card: AdminEventBusinessCard;
  readonly onSaved: (card: AdminEventBusinessCard) => void;
  readonly onUnauthorized: () => void;
}) {
  const fieldId = useId();
  const [profileUrl, setProfileUrl] = useState(card.profileUrl ?? "");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [generating, setGenerating] = useState(0);
  const [side, setSide] = useState<CardPreviewSide>("back");
  const [showCard, setShowCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    import("qrcode").then(({ default: qrCode }) => qrCode.toString(card.url, {
      type: "svg", errorCorrectionLevel: "M", margin: 4, width: 512,
    })).then((svg) => {
      if (active) { setQr(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); setQrError(false); }
    }).catch(() => { if (active) setQrError(true); });
    return () => { active = false; };
  }, [card.url, generating]);

  const change = async (action: () => Promise<AdminEventBusinessCard>, success: string, clearCode = false) => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const updated = await action();
      onSaved(updated);
      setProfileUrl(updated.profileUrl ?? "");
      if (clearCode) setCode("");
      setMessage(success);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) { onUnauthorized(); return; }
      setError(cause instanceof Error ? cause.message : "연결을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };
  const saveProfile = () => {
    const problem = businessCardProfileUrlProblem(profileUrl);
    if (problem) { setError(problem); return; }
    void change(() => connectEventBusinessCard(eventId, registration.id, profileUrl.trim() || null), "프로필 주소를 저장했습니다.");
  };
  const connectMember = () => {
    const normalized = code.replace(/[ -]/g, "").toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) {
      setError("배우 화면에 표시된 8자리 연결 코드를 입력해 주세요.");
      return;
    }
    void change(() => connectEventBusinessCardMember(eventId, registration.id, normalized), "배우 회원을 연결했습니다. 코드는 사용 완료됐습니다.", true);
  };

  return (
    <details className="mt-3 rounded-control border border-border-soft p-3">
      <summary className="cursor-pointer font-semibold">명함 QR · 프로필 연결{card.profileUrl ? " (연결됨)" : " (프로필 준비 중)"}</summary>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- 로컬에서 생성한 QR SVG다. */}
              <img src={qr} alt={`${registration.name}님의 명함 QR`} width={112} height={112} className="shrink-0 bg-white" />
              <a href={qr} download={`yesulin-card-${registration.id}.svg`} className="rounded-control border border-border px-3 py-2 font-semibold">QR SVG 다운로드</a>
              <AdminActionButton tone="quiet" onClick={() => setShowCard((current) => !current)}>{showCard ? "명함 접기" : "QR이 들어간 명함 보기"}</AdminActionButton>
            </>
          ) : qrError ? <p role="alert">QR을 만들지 못했습니다. <button type="button" className="underline" onClick={() => setGenerating((value) => value + 1)}>다시 시도</button></p>
            : <p role="status" className="text-muted">QR을 만드는 중이에요.</p>}
        </div>
        <a href={card.url} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline" aria-label={`${registration.name}님의 고정 QR 주소 열기 (새 창)`}>{card.url}</a>
        <p className="text-xs leading-5 text-muted-strong">이 주소는 인쇄 후에도 유지됩니다. 프로필 주소를 비우면 준비 중 안내가 표시됩니다. 회원 연결만으로 프로필이 공개되지는 않습니다.</p>
        {showCard && qr ? <EventBusinessCardPreview draft={registeredBusinessCardDraft(registration)} photoUrl={registration.photoUrl} side={side} onSideChange={setSide} qrImageUrl={qr} /> : null}
        <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }} className="flex flex-col gap-3">
          <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3">
            <label htmlFor={`${fieldId}-profile`} className="flex flex-col gap-1">
              <span className="font-semibold">공개 프로필 주소</span>
              <input id={`${fieldId}-profile`} type="url" maxLength={2000} value={profileUrl} onChange={(event) => { setProfileUrl(event.target.value); setMessage(null); }} placeholder="https://…" className="min-h-11 w-full rounded-control border border-border bg-card px-3" />
            </label>
            <AdminActionButton type="submit" disabled={saving} className="self-start">프로필 주소 저장</AdminActionButton>
          </fieldset>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); connectMember(); }} noValidate className="flex flex-col gap-3 border-t border-border-soft pt-4">
          <p className="font-semibold">{card.memberId ? `배우 회원 #${card.memberId} 연결됨` : "아직 회원이 연결되지 않았어요"}</p>
          <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3">
            <label htmlFor={`${fieldId}-code`} className="flex flex-col gap-1">
              <span className="font-semibold">배우의 임시 회원 연결 코드</span>
              <input id={`${fieldId}-code`} value={code} onChange={(event) => { setCode(event.target.value); setMessage(null); }} maxLength={32} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-EFGH" aria-describedby={`${fieldId}-code-help`} className="min-h-11 w-full rounded-control border border-border bg-card px-3 font-mono" />
              <span id={`${fieldId}-code-help`} className="text-xs leading-5 text-muted">참가자가 본인 계정으로 로그인한 뒤 마이페이지 → 회원 연결 코드 확인에서 발급한 코드를 입력해 주세요. 지금 선택한 {registration.name}님의 신청에 연결됩니다.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <AdminActionButton type="submit" disabled={saving}>{saving ? "처리 중…" : card.memberId ? "새 코드로 회원 변경" : "코드로 회원 연결"}</AdminActionButton>
              {card.memberId ? <AdminActionButton tone="quiet" disabled={saving} onClick={() => void change(() => disconnectEventBusinessCardMember(eventId, registration.id), "회원 연결을 해제했습니다. QR과 프로필 주소는 유지됩니다.")}>회원 연결 해제</AdminActionButton> : null}
            </div>
          </fieldset>
        </form>
        {error ? <p role="alert" className="text-fail">{error}</p> : null}
        {message ? <p role="status" className="text-pass">{message}</p> : null}
      </div>
    </details>
  );
}

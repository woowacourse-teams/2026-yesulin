"use client";

import { useId, useState } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { publishActorPage, type PublishedActorPage } from "@/features/actor-pages/owner-api";
import {
  ACTOR_PAGE_CONSENT_TEXT,
  canPublish,
  missingFieldLabel,
  publishBlockers,
  type ActorPageSettings,
} from "@/features/actor-pages/settings";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { errorMessage } from "@/features/auditions/use-audition-query";

type DialogMode = "prompt" | "publish";

/**
 * 공개할 때마다 필수 동의를 받는다. `prompt`는 프로필을 처음 저장한 뒤 한 번 띄우는 팝업이라 공개 조건이 부족하면
 * 설정 영역으로 안내한다. 열 때마다 동의 체크가 비어 있도록 부모가 열려 있을 때만 그린다.
 */
export function ActorPagePublishDialog({
  mode,
  settings,
  profile,
  onClose,
  onPublished,
  onOpenSettings,
}: {
  readonly mode: DialogMode;
  readonly settings: ActorPageSettings;
  readonly profile: ApplicantProfileResponse;
  readonly onClose: () => void;
  readonly onPublished: (result: PublishedActorPage) => void;
  readonly onOpenSettings?: () => void;
}) {
  const titleId = useId();
  const consentId = useId();
  const [agreed, setAgreed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const blockers = publishBlockers(settings, profile.photoLibrary);
  const ready = canPublish(blockers);

  const publish = async () => {
    if (!agreed) { setError("공개에 동의해야 공개할 수 있어요."); return; }
    setPublishing(true);
    setError("");
    try {
      onPublished(await publishActorPage(profile, settings.consentVersion));
    } catch (cause) {
      console.error("[배우 페이지 공개 실패]", cause);
      setError(errorMessage(cause, "배우 페이지를 공개하지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={() => { if (!publishing) onClose(); }}
      labelledBy={titleId}
      placement="responsiveSheet"
      className="max-h-[90dvh] w-full overflow-y-auto rounded-t-modal bg-card p-5 shadow-xl md:w-[calc(100vw-32px)] md:max-w-lg md:rounded-modal md:p-6"
    >
      <h2 id={titleId} className="text-xl font-bold">{mode === "prompt" ? "배우 페이지로 공개할까요?" : "배우 페이지를 공개할까요?"}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-strong">
        공개하면 누구나 내 배우 페이지를 볼 수 있고 배우 목록에도 나와요. 언제든 비공개로 바꿀 수 있어요.
      </p>

      {ready ? (
        <>
          <p className="mt-3 text-sm leading-6 text-muted-strong">
            학력·경력·자기소개 같은 항목과 사진·영상은 공개로 설정한 것만 보여요.
            {mode === "prompt" ? " 항목별 공개 설정은 ‘배우 페이지’ 탭에서 바꿀 수 있어요." : ""}
          </p>
          <div className="mt-5 rounded-card border border-border bg-surface p-4">
            <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                id={consentId}
                type="checkbox"
                checked={agreed}
                disabled={publishing}
                onChange={(event) => { setAgreed(event.target.checked); setError(""); }}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-brand"
              />
              <span><strong className="font-semibold">(필수)</strong> {ACTOR_PAGE_CONSENT_TEXT}</span>
            </label>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-card border border-border bg-surface p-4 text-sm leading-6">
          {blockers.locked ? <p>운영자가 잠근 페이지라 지금은 공개할 수 없어요.</p> : null}
          {blockers.underAge ? <p>만 14세 미만은 배우 페이지를 공개할 수 없어요.</p> : null}
          {blockers.missing.length ? (
            <p>공개하려면 먼저 채워 주세요: <strong className="font-semibold">{blockers.missing.map(missingFieldLabel).join(", ")}</strong></p>
          ) : null}
        </div>
      )}

      {error ? <p role="alert" className="mt-4 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <SecondaryButton onClick={onClose} disabled={publishing}>{mode === "prompt" ? "나중에" : "취소"}</SecondaryButton>
        {ready ? (
          <PrimaryButton onClick={() => void publish()} disabled={publishing || !agreed}>
            {publishing ? "공개하는 중…" : "공개하기"}
          </PrimaryButton>
        ) : onOpenSettings ? (
          <PrimaryButton onClick={onOpenSettings}>배우 페이지 설정하기</PrimaryButton>
        ) : null}
      </div>
    </ModalShell>
  );
}

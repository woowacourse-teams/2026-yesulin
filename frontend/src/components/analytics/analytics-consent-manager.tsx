"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { DialogFooter, DialogHeader, MODAL_LAYERS, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  clearGoogleAnalyticsCookies,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/features/analytics/consent";
import type { AnalyticsConsent } from "@/features/analytics/consent";
import { clearLoginAnalyticsState, trackLoginReturnIfPending } from "@/features/analytics/events";

export function AnalyticsConsentManager({ gtmId }: { readonly gtmId?: string }) {
  const pathname = usePathname();
  const hasApplicantMobileNavigation = pathname.startsWith("/applicants");
  const titleId = useId();
  const [consent, setConsent] = useState<AnalyticsConsent | null>();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setConsent(readAnalyticsConsent()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    trackLoginReturnIfPending(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!gtmId || consent !== "granted" || document.getElementById("yesulin-gtm")) return;
    window.dataLayer = window.dataLayer ?? [];
    pushGoogleConsent("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    pushGoogleConsent("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.id = "yesulin-gtm";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);
  }, [consent, gtmId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      const next = readAnalyticsConsent();
      if (consent === "granted" && next !== "granted") {
        clearLoginAnalyticsState();
        clearGoogleAnalyticsCookies();
        window.location.reload();
        return;
      }
      setConsent(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [consent]);

  if (!gtmId || consent === undefined) return null;

  const choose = (next: AnalyticsConsent) => {
    const revoking = consent === "granted" && next === "denied";
    writeAnalyticsConsent(next);
    setConsent(next);
    setSettingsOpen(false);
    if (revoking) {
      clearLoginAnalyticsState();
      clearGoogleAnalyticsCookies();
      window.location.reload();
    }
  };

  return <>
    {consent === null ? <ConsentBanner onAccept={() => choose("granted")} onReject={() => choose("denied")} /> : null}
    {consent !== null ? <TextButton onClick={() => setSettingsOpen(true)} className={`fixed right-3 z-40 min-h-9 rounded-full border border-border bg-card px-3 text-xs shadow-[var(--shadow-1)] ${hasApplicantMobileNavigation ? "bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-[max(12px,env(safe-area-inset-bottom))]" : "bottom-[max(12px,env(safe-area-inset-bottom))]"}`}>분석 설정</TextButton> : null}
    <ModalShell
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      labelledBy={titleId}
      layer={{ scrim: MODAL_LAYERS.video.panel + 1, panel: MODAL_LAYERS.video.panel + 2 }}
      placement="responsiveSheet"
      className="w-full overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(560px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={titleId} title="방문 분석 설정" subtitle="선택은 서비스 이용에 영향을 주지 않으며 언제든 변경할 수 있어요." />
      <ConsentDetails current={consent} />
      <DialogFooter>
        <SecondaryButton onClick={() => choose("denied")}>분석 거부</SecondaryButton>
        <PrimaryButton onClick={() => choose("granted")}>분석 동의</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  </>;
}

const pushGoogleConsent = function () {
  // Google의 gtag 명령 형식은 일반 배열이 아니라 Arguments 객체다.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer?.push(arguments);
} as (...command: unknown[]) => void;

function ConsentBanner({ onAccept, onReject }: { readonly onAccept: () => void; readonly onReject: () => void }) {
  return <section aria-labelledby="analytics-consent-title" className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-70 mx-auto max-w-3xl rounded-card border border-border bg-card p-5 shadow-[var(--shadow-modal)] md:flex md:items-center md:gap-6 md:p-6">
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-brand">선택 분석 쿠키</p>
      <h2 id="analytics-consent-title" className="mt-1 text-lg font-bold">서비스를 더 편리하게 개선하도록 도와주세요</h2>
      <p className="mt-2 text-sm leading-6 text-muted-strong">Google Analytics로 방문과 로그인·지원 흐름을 분석합니다. 이름, 연락처, 지원서 내용은 보내지 않으며 거부해도 모든 기능을 이용할 수 있어요.</p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 md:mt-0 md:w-56">
      <SecondaryButton onClick={onReject}>거부</SecondaryButton>
      <PrimaryButton onClick={onAccept}>동의</PrimaryButton>
    </div>
  </section>;
}

function ConsentDetails({ current }: { readonly current: AnalyticsConsent | null }) {
  return <div className="space-y-4 px-5 py-6 text-sm leading-6 text-muted-strong md:px-6">
    <p className="rounded-control border border-brand-line bg-brand-soft px-4 py-3"><strong className="block text-foreground">현재 선택</strong>{current === "granted" ? "방문 분석에 동의했습니다." : "방문 분석을 거부했습니다."}</p>
    <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2">
      <dt className="font-semibold text-foreground">도구</dt><dd>Google Analytics 4 · Google Tag Manager</dd>
      <dt className="font-semibold text-foreground">목적</dt><dd>페이지 이용, 로그인 진입과 지원 단계별 이탈 분석</dd>
      <dt className="font-semibold text-foreground">수집 제외</dt><dd>이름, 이메일, 전화번호, 지원서 답변, 사진·영상 URL</dd>
      <dt className="font-semibold text-foreground">쿠키</dt><dd><code>_ga</code> 계열, Google 기본 설정 기준 최대 2년</dd>
    </dl>
    <p className="text-xs leading-5 text-muted">거부하거나 동의를 철회하면 GTM을 불러오지 않고 현재 브라우저의 Google Analytics 쿠키를 삭제합니다.</p>
  </div>;
}

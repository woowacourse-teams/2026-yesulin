"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { DialogFooter, DialogHeader, MODAL_LAYERS, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_READY_EVENT,
  ANALYTICS_SCRIPT_ID,
  clearGoogleAnalyticsCookies,
  isAnalyticsEnabled,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/features/analytics/consent";
import type { AnalyticsConsent, AnalyticsConsentState } from "@/features/analytics/consent";
import { clearLoginAnalyticsState, trackLoginReturnIfPending } from "@/features/analytics/events";
import { setAnalyticsSettingsOpener } from "@/features/analytics/settings-entry";
import { resetProductAnalytics, startProductAnalytics } from "@/features/analytics/product-analytics";

export function AnalyticsConsentManager({ gtmId }: { readonly gtmId?: string }) {
  const pathname = usePathname();
  const titleId = useId();
  const [consent, setConsent] = useState<AnalyticsConsentState>();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConsent(readAnalyticsConsent());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    trackLoginReturnIfPending(pathname);
  }, [pathname]);

  useEffect(() => {
    if (consent === undefined || !isAnalyticsEnabled(consent)) return;
    void startProductAnalytics().then(ready => {
      if (ready) window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    });
  }, [consent]);

  useEffect(() => {
    if (!gtmId || consent === undefined || !isAnalyticsEnabled(consent)) return;
    const initialized = document.getElementById(ANALYTICS_SCRIPT_ID) !== null;
    window.dataLayer = window.dataLayer ?? [];
    if (!initialized) {
      pushGoogleConsent("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
    pushGoogleConsent("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    if (!initialized) {
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const script = document.createElement("script");
      script.id = ANALYTICS_SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
      document.head.appendChild(script);
    }
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  }, [consent, gtmId]);

  useEffect(() => {
    if (consent === undefined) {
      setAnalyticsSettingsOpener(null);
      return;
    }
    const open = () => setSettingsOpen(true);
    setAnalyticsSettingsOpener(open);
    return () => setAnalyticsSettingsOpener(null);
  }, [consent, gtmId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      const next = readAnalyticsConsent();
      if (consent !== undefined && isAnalyticsEnabled(consent) && !isAnalyticsEnabled(next)) {
        resetProductAnalytics();
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

  if (consent === undefined) return null;

  const choose = (next: AnalyticsConsent) => {
    const revoking = isAnalyticsEnabled(consent) && next === "denied";
    const saved = writeAnalyticsConsent(next);
    setConsent(readAnalyticsConsent());
    setSettingsOpen(false);
    if (!revoking) return;
    resetProductAnalytics();
    clearLoginAnalyticsState();
    clearGoogleAnalyticsCookies();
    if (saved) {
      window.location.reload();
      return;
    }
    // 거부를 저장하지 못했으니 새로고침하면 다시 켜진다. 이 페이지에 이미 불러온 GTM의 분석 저장만 끈다.
    pushGoogleConsent("consent", "update", { analytics_storage: "denied" });
  };

  const enabled = isAnalyticsEnabled(consent);

  return <>
    <ModalShell
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      labelledBy={titleId}
      layer={{ scrim: MODAL_LAYERS.video.panel + 1, panel: MODAL_LAYERS.video.panel + 2 }}
      placement="responsiveSheet"
      className="w-full overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(560px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={titleId} title="방문 분석 설정" subtitle="방문 분석은 기본으로 켜져 있어요. 꺼도 서비스 이용에는 영향이 없고 언제든 다시 켤 수 있어요." />
      <ConsentDetails enabled={enabled} googleAnalyticsEnabled={Boolean(gtmId)} />
      <DialogFooter>
        {enabled ? <>
          <SecondaryButton onClick={() => choose("denied")}>분석 끄기</SecondaryButton>
          <PrimaryButton onClick={() => setSettingsOpen(false)}>닫기</PrimaryButton>
        </> : <>
          <SecondaryButton onClick={() => setSettingsOpen(false)}>닫기</SecondaryButton>
          <PrimaryButton onClick={() => choose("granted")}>분석 켜기</PrimaryButton>
        </>}
      </DialogFooter>
    </ModalShell>
  </>;
}

const pushGoogleConsent = function () {
  // Google의 gtag 명령 형식은 일반 배열이 아니라 Arguments 객체다.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer?.push(arguments);
} as (...command: unknown[]) => void;

function ConsentDetails({ enabled, googleAnalyticsEnabled }: { readonly enabled: boolean; readonly googleAnalyticsEnabled: boolean }) {
  return <div className="space-y-4 px-5 py-6 text-sm leading-6 text-muted-strong md:px-6">
    <p className="rounded-control border border-brand-line bg-brand-soft px-4 py-3"><strong className="block text-foreground">현재 선택</strong>{enabled ? "방문 분석이 켜져 있습니다." : "방문 분석을 껐습니다."}</p>
    <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2">
      <dt className="font-semibold text-foreground">도구</dt><dd>예술in 링크 방문 집계{googleAnalyticsEnabled ? " · Google Analytics 4 · Google Tag Manager" : ""}{process.env.NEXT_PUBLIC_POSTHOG_KEY ? " · PostHog" : ""}</dd>
      <dt className="font-semibold text-foreground">목적</dt><dd>공고 이용·재방문, 예매·PDF·심사 기능의 이용 흐름과 개선 효과 확인</dd>
      {process.env.NEXT_PUBLIC_POSTHOG_KEY && <><dt className="font-semibold text-foreground">PostHog</dt><dd>방문·가명 계정 식별자와 이용 행동을 미국 리전에 전송합니다. <Link href="/privacy/analytics" className="text-brand underline">수집 항목과 거부 방법</Link></dd></>}
      <dt className="font-semibold text-foreground">수집 제외</dt><dd>이름, 이메일, 전화번호, 지원서 답변, 사진·영상 URL</dd>
      <dt className="font-semibold text-foreground">브라우저 저장</dt><dd>공고별 링크 방문 집계 여부{googleAnalyticsEnabled ? ", _ga 계열 쿠키(Google 기본 설정 기준 최대 2년)" : ""}{process.env.NEXT_PUBLIC_POSTHOG_KEY ? ", PostHog 방문 식별자(로컬 저장소)" : ""}</dd>
    </dl>
    <p className="text-xs leading-5 text-muted">끄면 링크 방문과 PostHog 분석 전송을 멈추고 PostHog 방문 식별자를 초기화해요. Google 분석이 연결된 환경에서는 GTM을 불러오지 않고 현재 브라우저의 Google Analytics 쿠키도 삭제해요. PDF 원문·사진·연락처·심사 메모는 분석 도구에 보내지 않아요.</p>
  </div>;
}

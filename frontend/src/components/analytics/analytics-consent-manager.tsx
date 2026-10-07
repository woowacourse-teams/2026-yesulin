"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { DialogFooter, DialogHeader, MODAL_LAYERS, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_READY_EVENT,
  clearGoogleAnalyticsCookies,
  isAnalyticsEnabled,
  readAnalyticsConsent,
  resetLegacyAnalyticsRefusal,
  writeAnalyticsConsent,
} from "@/features/analytics/consent";
import type { AnalyticsConsent, AnalyticsConsentState } from "@/features/analytics/consent";
import { clearLoginAnalyticsState, trackLoginReturnIfPending } from "@/features/analytics/events";
import { setAnalyticsSettingsOpener } from "@/features/analytics/settings-entry";

export function AnalyticsConsentManager({ gtmId }: { readonly gtmId?: string }) {
  const pathname = usePathname();
  const titleId = useId();
  const [consent, setConsent] = useState<AnalyticsConsentState>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refusalResetNotice, setRefusalResetNotice] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRefusalResetNotice(resetLegacyAnalyticsRefusal());
      setConsent(readAnalyticsConsent());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    trackLoginReturnIfPending(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!gtmId || consent === undefined || !isAnalyticsEnabled(consent) || document.getElementById("yesulin-gtm")) return;
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
    window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  }, [consent, gtmId]);

  useEffect(() => {
    if (!gtmId || consent === undefined) {
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
    const revoking = isAnalyticsEnabled(consent) && next === "denied";
    const saved = writeAnalyticsConsent(next);
    setConsent(readAnalyticsConsent());
    setSettingsOpen(false);
    if (!revoking) return;
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
    {refusalResetNotice && enabled ? <RefusalResetNotice
      onKeep={() => setRefusalResetNotice(false)}
      onTurnOff={() => {
        setRefusalResetNotice(false);
        choose("denied");
      }}
    /> : null}
    <ModalShell
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      labelledBy={titleId}
      layer={{ scrim: MODAL_LAYERS.video.panel + 1, panel: MODAL_LAYERS.video.panel + 2 }}
      placement="responsiveSheet"
      className="w-full overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(560px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={titleId} title="방문 분석 설정" subtitle="방문 분석은 기본으로 켜져 있어요. 꺼도 서비스 이용에는 영향이 없고 언제든 다시 켤 수 있어요." />
      <ConsentDetails enabled={enabled} />
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

/**
 * 1.0 배너에서 거부했던 이용자에게 한 번만 띄운다. 화면을 가리지 않게 하단에 작게 두고,
 * 끄기 버튼은 확인 버튼과 같은 크기로 보여 바로 다시 거부할 수 있게 한다.
 */
function RefusalResetNotice({ onKeep, onTurnOff }: { readonly onKeep: () => void; readonly onTurnOff: () => void }) {
  return <section aria-labelledby="analytics-reset-title" className="fixed left-[max(12px,env(safe-area-inset-left))] right-[max(12px,env(safe-area-inset-right))] bottom-[max(12px,env(safe-area-inset-bottom))] z-70 mx-auto max-w-md rounded-card border border-border bg-card p-4 shadow-[var(--shadow-modal)] md:left-auto md:right-6 md:mx-0 md:w-[400px]">
    <h2 id="analytics-reset-title" className="text-sm font-bold text-foreground">방문 분석 방식이 바뀌었어요</h2>
    <p className="mt-1.5 text-sm leading-6 text-muted-strong">처리방침 개정으로 이전에 거부하신 설정도 지금은 켜져 있어요. 공고·공연 화면을 개선하는 데 이동 흐름만 쓰고, 이름·연락처·지원서 내용은 보내지 않아요. <Link href="/privacy#analytics" className="font-medium text-brand hover:underline">자세히</Link></p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <SecondaryButton onClick={onTurnOff}>분석 끄기</SecondaryButton>
      <PrimaryButton onClick={onKeep}>확인</PrimaryButton>
    </div>
  </section>;
}

function ConsentDetails({ enabled }: { readonly enabled: boolean }) {
  return <div className="space-y-4 px-5 py-6 text-sm leading-6 text-muted-strong md:px-6">
    <p className="rounded-control border border-brand-line bg-brand-soft px-4 py-3"><strong className="block text-foreground">현재 선택</strong>{enabled ? "방문 분석이 켜져 있습니다." : "방문 분석을 껐습니다."}</p>
    <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2">
      <dt className="font-semibold text-foreground">도구</dt><dd>Google Analytics 4 · Google Tag Manager</dd>
      <dt className="font-semibold text-foreground">목적</dt><dd>페이지 이용, 로그인 진입과 지원 단계별 이탈 분석</dd>
      <dt className="font-semibold text-foreground">수집 제외</dt><dd>이름, 이메일, 전화번호, 지원서 답변, 사진·영상 URL</dd>
      <dt className="font-semibold text-foreground">쿠키</dt><dd><code>_ga</code> 계열, Google 기본 설정 기준 최대 2년</dd>
    </dl>
    <p className="text-xs leading-5 text-muted">끄면 GTM을 불러오지 않고 현재 브라우저의 Google Analytics 쿠키를 삭제합니다.</p>
  </div>;
}

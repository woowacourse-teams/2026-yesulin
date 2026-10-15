"use client";

import Image from "next/image";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { bannerSlideReducer, HOME_BANNERS, INITIAL_BANNER_SLIDE, type HomeBanner } from "@/features/landing/home-banners";
import { SiteIcon } from "@/components/ui/site-icon";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const IMAGE_SIZES = "(min-width: 1208px) 1080px, (max-width: 760px) calc(100vw - 40px), calc(100vw - 128px)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** 배너별 링크와 기존 공고 알림 집계를 유지하는 방향성 슬라이드. */
export function AuditionAlertBanner() {
  const [state, dispatch] = useReducer(bannerSlideReducer, INITIAL_BANNER_SLIDE);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const move = useCallback((delta: number) => dispatch({ type: "move", delta, count: HOME_BANNERS.length, reducedMotion }), [reducedMotion]);
  const finish = useCallback(() => dispatch({ type: "finish" }), []);
  const playing = !hovered && !focused && !reducedMotion && visible;
  const active = HOME_BANNERS[state.active];

  useEffect(() => {
    if (!playing || state.previous !== null) return;
    const timer = window.setTimeout(() => move(1), 7_000);
    return () => window.clearTimeout(timer);
  }, [playing, state.active, state.previous, move]);

  useEffect(() => {
    if (state.previous === null) return;
    // 설정 변경이나 백그라운드 탭에서 animationend가 생략되어도 잠금은 해제한다.
    const timer = window.setTimeout(finish, 550);
    return () => window.clearTimeout(timer);
  }, [state.previous, finish]);

  return <section className="notebook-banner" aria-label="예술in 소식" aria-roledescription="캐러셀" data-tone={active.tone}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
    <div className="notebook-banner-stage"><div className="notebook-banner-viewport" data-direction={state.direction}
      onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
      onTouchCancel={() => { touchStart.current = null; }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;
        if (!start || !touch) return;
        const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { suppressClickUntil.current = Date.now() + 500; move(dx < 0 ? 1 : -1); }
      }}
      onClickCapture={(event) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
      {state.previous !== null ? <BannerArtwork key={`out-${state.previous}`} banner={HOME_BANNERS[state.previous]} outgoing /> : null}
      <BannerArtwork key={`in-${state.active}`} banner={active} entering={state.previous !== null} onAnimationEnd={finish} />
    </div>
      <button type="button" className="notebook-banner-direction is-previous" aria-label="이전 배너" disabled={state.previous !== null} onClick={() => move(-1)}><SiteIcon name="previous" size={26} /></button>
      <button type="button" className="notebook-banner-direction is-next" aria-label="다음 배너" disabled={state.previous !== null} onClick={() => move(1)}><SiteIcon name="next" size={26} /></button>
    </div>
    <span className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">{active.title}</span>
    <div className="notebook-banner-pagination" role="group" aria-label="배너 선택">
      {HOME_BANNERS.map((banner, index) => <button key={banner.id} type="button" className="notebook-banner-page" aria-label={`${banner.title} 배너 보기`} aria-pressed={index === state.active} disabled={state.previous !== null} onClick={() => move(index - state.active)}><span /></button>)}
    </div>
  </section>;
}

function BannerArtwork({ banner, outgoing = false, entering = false, onAnimationEnd }: {
  readonly banner: HomeBanner;
  readonly outgoing?: boolean;
  readonly entering?: boolean;
  readonly onAnimationEnd?: () => void;
}) {
  return <div className={`notebook-banner-slide${outgoing ? " is-outgoing" : entering ? " is-entering" : ""}`}
    aria-hidden={outgoing || undefined} inert={outgoing} role="group" aria-roledescription="슬라이드" aria-label={banner.title}
    onAnimationEnd={(event) => { if (event.target === event.currentTarget) onAnimationEnd?.(); }}>
    <a href={banner.href} target="_blank" rel="noopener noreferrer" aria-label={`${banner.linkLabel} (새 창에서 열림)`}
      onClick={() => { if (banner.id === "audition-alert") trackAnalyticsEvent("kakao_openchat_click", { entry_point: "home_alert_banner" }); }}>
      <picture><source media="(max-width: 640px)" srcSet={banner.mobile.src} width={banner.mobile.width} height={banner.mobile.height} />
        <Image src={banner.desktop.src} alt={banner.alt} width={banner.desktop.width} height={banner.desktop.height} sizes={IMAGE_SIZES} priority />
      </picture>
    </a>
  </div>;
}

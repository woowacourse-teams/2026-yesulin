"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { getEventBanners } from "@/features/events/api";
import type { EventBanner } from "@/features/events/types";
import { bannerSlideReducer, bannerSwipeDirection, homeBanners, INITIAL_BANNER_SLIDE, type HomeBanner } from "@/features/landing/home-banners";
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

/**
 * 배너별 링크와 기존 공고 알림 집계를 유지하는 방향성 슬라이드. 고정 배너 앞에 노출 중인 이벤트 배너를 넣는다.
 * 서버가 이벤트 배너를 읽지 않았으면(null) 브라우저에서 읽고, 실패하면 고정 배너만 보인다.
 */
export function AuditionAlertBanner({ initialEventBanners = null }: { readonly initialEventBanners?: readonly EventBanner[] | null }) {
  const [eventBanners, setEventBanners] = useState<readonly EventBanner[]>(initialEventBanners ?? []);
  const banners = useMemo(() => homeBanners(eventBanners), [eventBanners]);
  const [state, dispatch] = useReducer(bannerSlideReducer, INITIAL_BANNER_SLIDE);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
  const pointerStart = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const suppressClickUntil = useRef(0);
  const move = useCallback((delta: number) => dispatch({ type: "move", delta, count: banners.length, reducedMotion }), [banners.length, reducedMotion]);
  const finish = useCallback(() => dispatch({ type: "finish" }), []);
  const playing = !hovered && !focused && !dragging && !reducedMotion && visible;
  const active = banners[Math.min(state.active, banners.length - 1)];

  useEffect(() => {
    if (initialEventBanners) return;
    let current = true;
    getEventBanners()
      .then((loaded) => { if (current) setEventBanners(loaded); })
      .catch(() => {});
    return () => { current = false; };
  }, [initialEventBanners]);

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

  const cancelDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    if (start.moved) suppressClickUntil.current = Date.now() + 500;
    pointerStart.current = null;
    setDragging(false);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    pointerStart.current = null;
    setDragging(false);
    // 가로 전환 기준에 못 미친 드래그도 링크 클릭으로 처리하지 않는다.
    if (start.moved || Math.hypot(dx, dy) > 8) suppressClickUntil.current = Date.now() + 500;
    const delta = bannerSwipeDirection(dx, dy);
    if (delta) move(delta);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <section className="notebook-banner" aria-label="예술in 소식" aria-roledescription="캐러셀" data-tone={active.tone}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
    <div className="notebook-banner-stage"><div className="notebook-banner-viewport" data-direction={state.direction} data-dragging={dragging || undefined}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        suppressClickUntil.current = 0;
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const start = pointerStart.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 8) start.moved = true;
        // 클릭·탭의 대상을 유지하다 가로 드래그일 때만 포인터를 잡는다. 영역 밖에서 놓아도 정상 종료한다.
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5 && !event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={finishDrag} onPointerCancel={cancelDrag}
      onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) cancelDrag(event); }}
      onLostPointerCapture={(event) => { if (event.target === event.currentTarget) cancelDrag(event); }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (event.detail !== 0 && Date.now() < suppressClickUntil.current) {
          suppressClickUntil.current = 0;
          event.preventDefault();
          event.stopPropagation();
        }
      }}>
      {state.previous !== null ? <BannerArtwork key={`out-${state.previous}`} banner={banners[state.previous]} outgoing /> : null}
      <BannerArtwork key={`in-${state.active}`} banner={active} entering={state.previous !== null} onAnimationEnd={finish} />
    </div>
      {/* 전환 중 입력은 reducer가 무시한다. disabled로 막으면 누른 버튼의 키보드 포커스가 body로 빠진다. */}
      <button type="button" className="notebook-banner-direction is-previous" aria-label="이전 배너" onClick={() => move(-1)}><SiteIcon name="previous" size={26} /></button>
      <button type="button" className="notebook-banner-direction is-next" aria-label="다음 배너" onClick={() => move(1)}><SiteIcon name="next" size={26} /></button>
    </div>
    <span className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">{active.title}</span>
    <div className="notebook-banner-pagination" role="group" aria-label="배너 선택">
      {banners.map((banner, index) => <button key={banner.id} type="button" className="notebook-banner-page" aria-label={`${banner.title} 배너 보기`} aria-pressed={index === state.active} onClick={() => move(index - state.active)}><span /></button>)}
    </div>
  </section>;
}

function BannerArtwork({ banner, outgoing = false, entering = false, onAnimationEnd }: {
  readonly banner: HomeBanner;
  readonly outgoing?: boolean;
  readonly entering?: boolean;
  readonly onAnimationEnd?: () => void;
}) {
  const picture = banner.remote ? <RemoteBannerPicture banner={banner} /> : <OptimizedBannerPicture banner={banner} />;
  return <div className={`notebook-banner-slide${outgoing ? " is-outgoing" : entering ? " is-entering" : ""}`}
    aria-hidden={outgoing || undefined} inert={outgoing} role="group" aria-roledescription="슬라이드" aria-label={banner.title}
    onAnimationEnd={(event) => { if (event.target === event.currentTarget) onAnimationEnd?.(); }}>
    {banner.external ? (
      <a href={banner.href} target="_blank" rel="noopener noreferrer" draggable={false} aria-label={`${banner.linkLabel} (새 창에서 열림)`}
        onClick={() => { if (banner.id === "audition-alert") trackAnalyticsEvent("kakao_openchat_click", { entry_point: "home_alert_banner" }); }}>
        {picture}
      </a>
    ) : <Link href={banner.href} draggable={false} aria-label={banner.linkLabel}>{picture}</Link>}
  </div>;
}

function OptimizedBannerPicture({ banner }: { readonly banner: HomeBanner }) {
  // <Image priority>는 media 조건 없이 PC 이미지를 미리 받아 모바일에서 두 장을 받으므로 두 크기를 각각 최적화한다.
  const common = { alt: banner.alt, sizes: IMAGE_SIZES, loading: "eager", fetchPriority: "high" } as const;
  const { props: { srcSet: mobileSrcSet } } = getImageProps({ ...common, ...banner.mobile });
  const { props: desktop } = getImageProps({ ...common, ...banner.desktop });
  return <picture><source media="(max-width: 640px)" srcSet={mobileSrcSet} sizes={IMAGE_SIZES} width={banner.mobile.width} height={banner.mobile.height} />
    <img {...desktop} alt={banner.alt} draggable={false} />
  </picture>;
}

/**
 * 운영자가 올린 이벤트 배너는 저장소 공개 주소를 그대로 쓴다. 슬라이드는 들어올 때만 그려지므로 바로 받는다. 지연 로딩이면
 * 화면 밖에서 밀려 들어오는 동안 이미지를 받지 않아 빈 칸이 보인다.
 */
function RemoteBannerPicture({ banner }: { readonly banner: HomeBanner }) {
  return <picture><source media="(max-width: 640px)" srcSet={banner.mobile.src} width={banner.mobile.width} height={banner.mobile.height} />
    <img src={banner.desktop.src} alt={banner.alt} width={banner.desktop.width} height={banner.desktop.height} loading="eager" decoding="async" draggable={false} />
  </picture>;
}

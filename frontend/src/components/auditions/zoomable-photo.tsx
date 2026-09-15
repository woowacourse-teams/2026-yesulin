"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ApplicantPhoto } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";

const MIN_SCALE = 1;
const MAX_SCALE = 1.5;
/** 100 · 110 · 120 · 130 · 140 · 150%. 얼굴을 확인하는 용도라 이 범위면 충분하다. */
const ZOOM_STEP = 0.1;
/** 끌었는지 눌렀는지 가르는 거리. 손이 조금 흔들려도 누름으로 본다. */
const CLICK_SLOP = 5;

type Transform = { readonly scale: number; readonly x: number; readonly y: number };

const FIT: Transform = { scale: MIN_SCALE, x: 0, y: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
/** 0.1씩 더하면 부동소수 오차로 119.99%가 되므로 단계마다 자른다. */
const snap = (value: number) => Math.round(clamp(value, MIN_SCALE, MAX_SCALE) * 10) / 10;

/** 확대한 만큼만 움직이게 막아 사진이 상자 밖으로 사라지지 않게 한다. */
function fit(next: Transform, frame: HTMLElement | null): Transform {
  if (next.scale <= MIN_SCALE) return FIT;
  if (!frame) return next;
  const maxX = (frame.clientWidth * (next.scale - 1)) / 2;
  const maxY = (frame.clientHeight * (next.scale - 1)) / 2;
  return { scale: next.scale, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
}

/** 커서 아래의 지점이 제자리에 남도록 확대 중심을 옮긴다. */
function zoomToward(current: Transform, scale: number, frame: HTMLElement | null, client?: { x: number; y: number }): Transform {
  const target = snap(scale);
  if (target === current.scale) return current;
  if (!frame || !client) return fit({ scale: target, x: current.x, y: current.y }, frame);
  const rect = frame.getBoundingClientRect();
  const cx = client.x - rect.left - rect.width / 2;
  const cy = client.y - rect.top - rect.height / 2;
  const ratio = target / current.scale;
  return fit({ scale: target, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio }, frame);
}

/**
 * 휠로 키우고 끌어서 옮길 수 있는 사진.
 * 배율을 되돌리려면 바깥에서 `key`를 바꿔 다시 마운트한다.
 */
export function ZoomablePhoto({
  photo,
  alt,
  sizes,
  className = "object-contain",
  priority = false,
  onActivate,
}: {
  readonly photo: ApplicantPhoto | undefined;
  readonly alt: string;
  readonly sizes: string;
  readonly className?: string;
  readonly priority?: boolean;
  /** 사진을 누르면 할 일. 넘기면 두 번 눌러 확대하는 동작 대신 이쪽을 쓴다. */
  readonly onActivate?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>(FIT);
  const zoomed = transform.scale > MIN_SCALE;

  // React의 onWheel은 passive로 붙어 기본 스크롤을 막을 수 없어 직접 등록한다.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      setTransform((current) => zoomToward(
        current,
        current.scale + direction * ZOOM_STEP,
        frame,
        { x: event.clientX, y: event.clientY },
      ));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  // 끄는 동안에는 창 전체에서 신호를 듣는다.
  // 포인터 캡처를 쓰면 사진이 페이지의 모든 입력을 가로채는데, 뗄 때를 한 번이라도 놓치면 화면이 먹통이 된다.
  const stopDragRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDragRef.current?.(), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    stopDragRef.current?.();

    const pointerId = event.pointerId;
    const start = { x: event.clientX, y: event.clientY, ox: transform.x, oy: transform.y, moved: false };

    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      stopDragRef.current = null;
    };

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) return;
      // 뗀 신호를 놓쳤더라도 버튼이 풀렸으면 여기서 끝낸다.
      if (moveEvent.buttons === 0) {
        stop();
        return;
      }
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      if (Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP) start.moved = true;
      setTransform((current) => (
        current.scale <= MIN_SCALE
          ? current
          : fit({ scale: current.scale, x: start.ox + dx, y: start.oy + dy }, frameRef.current)
      ));
    }

    function onEnd(endEvent: PointerEvent) {
      if (endEvent.pointerId !== pointerId) return;
      const activate = endEvent.type === "pointerup" && !start.moved;
      stop();
      if (activate) onActivate?.();
    }

    stopDragRef.current = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const onDoubleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (onActivate) return;
    const client = { x: event.clientX, y: event.clientY };
    setTransform((current) => (
      current.scale > MIN_SCALE ? FIT : zoomToward(current, MAX_SCALE, frameRef.current, client)
    ));
  };

  const step = (direction: number) => setTransform((current) => zoomToward(
    current,
    current.scale + direction * ZOOM_STEP,
    frameRef.current,
  ));

  return (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onDragStart={(event) => event.preventDefault()}
      className={`absolute inset-0 select-none overflow-hidden ${
        zoomed ? "cursor-grab touch-none active:cursor-grabbing" : onActivate ? "cursor-zoom-in" : ""
      }`}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
      >
        <ApplicantPhotoImage photo={photo} alt={alt} sizes={sizes} className={className} priority={priority} />
      </div>

      <div
        className="absolute bottom-3 right-3 z-3 flex items-center overflow-hidden rounded-control bg-foreground/75 text-white backdrop-blur-sm"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ZoomButton label="사진 축소" disabled={transform.scale <= MIN_SCALE} onClick={() => step(-1)}>−</ZoomButton>
        <button
          type="button"
          onClick={() => setTransform(FIT)}
          disabled={!zoomed}
          className="num h-11 w-11 text-xs font-bold hover:bg-white/15 disabled:opacity-60"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <ZoomButton label="사진 확대" disabled={transform.scale >= MAX_SCALE} onClick={() => step(1)}>+</ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({ label, disabled, onClick, children }: {
  readonly label: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center text-lg font-bold leading-none hover:bg-white/15 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

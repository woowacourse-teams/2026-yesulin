"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ApplicantPhoto } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** 휠 한 칸(deltaY 100)에 약 1.16배. 한 칸이 한 단계처럼 느껴지는 값이다. */
const WHEEL_SENSITIVITY = 1.0015;
const STEP = 1.4;
const DOUBLE_CLICK_SCALE = 2.5;

type Transform = { readonly scale: number; readonly x: number; readonly y: number };

const FIT: Transform = { scale: MIN_SCALE, x: 0, y: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * 확대한 만큼만 움직이게 막아 사진이 상자 밖으로 사라지지 않게 한다.
 * 배율이 1이면 움직일 여지가 없으므로 항상 가운데로 돌아온다.
 */
function fit(next: Transform, frame: HTMLElement | null): Transform {
  if (next.scale <= MIN_SCALE) return FIT;
  if (!frame) return next;
  const maxX = (frame.clientWidth * (next.scale - 1)) / 2;
  const maxY = (frame.clientHeight * (next.scale - 1)) / 2;
  return { scale: next.scale, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
}

/** 커서 아래의 지점이 제자리에 남도록 확대 중심을 옮긴다. */
function zoomToward(current: Transform, scale: number, frame: HTMLElement | null, client?: { x: number; y: number }): Transform {
  const target = clamp(scale, MIN_SCALE, MAX_SCALE);
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
}: {
  readonly photo: ApplicantPhoto | undefined;
  readonly alt: string;
  readonly sizes: string;
  readonly className?: string;
  readonly priority?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [transform, setTransform] = useState<Transform>(FIT);
  const zoomed = transform.scale > MIN_SCALE;

  // React의 onWheel은 passive로 붙어 기본 스크롤을 막을 수 없어 직접 등록한다.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setTransform((current) => zoomToward(
        current,
        current.scale * WHEEL_SENSITIVITY ** -event.deltaY,
        frame,
        { x: event.clientX, y: event.clientY },
      ));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!zoomed || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: transform.x, oy: transform.y };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    const moved = { x: start.ox + (event.clientX - start.x), y: start.oy + (event.clientY - start.y) };
    setTransform((current) => fit({ scale: current.scale, ...moved }, frameRef.current));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onDoubleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const client = { x: event.clientX, y: event.clientY };
    setTransform((current) => (
      current.scale > MIN_SCALE ? FIT : zoomToward(current, DOUBLE_CLICK_SCALE, frameRef.current, client)
    ));
  };

  const step = (factor: number) => setTransform((current) => zoomToward(current, current.scale * factor, frameRef.current));

  return (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      className={`absolute inset-0 overflow-hidden ${zoomed ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
      >
        <ApplicantPhotoImage photo={photo} alt={alt} sizes={sizes} className={className} priority={priority} />
      </div>

      <div className="absolute bottom-3 right-3 z-3 flex items-center gap-1 rounded-control bg-foreground/75 p-1 text-white backdrop-blur-sm">
        <ZoomButton label="사진 축소" disabled={!zoomed} onClick={() => step(1 / STEP)}>−</ZoomButton>
        <button
          type="button"
          onClick={() => setTransform(FIT)}
          disabled={!zoomed}
          className="num min-h-8 min-w-12 rounded-md px-1 text-xs font-bold hover:bg-white/15 disabled:opacity-60"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <ZoomButton label="사진 확대" disabled={transform.scale >= MAX_SCALE} onClick={() => step(STEP)}>+</ZoomButton>
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
      className="grid h-8 w-8 place-items-center rounded-md text-lg font-bold leading-none hover:bg-white/15 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

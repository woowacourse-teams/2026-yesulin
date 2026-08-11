"use client";

import { useCallback, useRef, useState } from "react";

const MIN_WIDTH = 190;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 250;
const KEYBOARD_STEP = 16;

/**
 * 사이드바 폭 조절 손잡이. WAI-ARIA Window Splitter 패턴을 따라
 * role="separator" + aria-valuenow를 쓰고 ←/→ 키도 받는다.
 */
export function SidebarResizer() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);

  const apply = useCallback((next: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, next));
    setWidth(clamped);
    document.documentElement.style.setProperty("--sidebar-width", `${clamped}px`);
  }, []);

  const stop = useCallback(() => {
    dragging.current = false;
    document.body.classList.remove("select-none");
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="사이드바 크기 조절"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      className="group fixed bottom-0 top-0 z-31 -ml-1 hidden w-[7px] cursor-col-resize touch-none lg:block"
      style={{ left: "var(--sidebar-width)" }}
      onPointerDown={(event) => {
        dragging.current = true;
        document.body.classList.add("select-none");
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragging.current) apply(event.clientX);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onDoubleClick={() => apply(DEFAULT_WIDTH)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          apply(width - KEYBOARD_STEP);
          event.preventDefault();
        } else if (event.key === "ArrowRight") {
          apply(width + KEYBOARD_STEP);
          event.preventDefault();
        }
      }}
    >
      <span className="absolute bottom-0 left-1 top-0 w-px bg-transparent transition-colors group-hover:bg-brand-line group-focus-visible:bg-brand-line" />
    </div>
  );
}

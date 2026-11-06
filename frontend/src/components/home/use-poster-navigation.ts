"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_NAVIGATION = { previous: false, next: false };

function posterLayout(row: HTMLUListElement) {
  const style = getComputedStyle(row);
  const gap = parseFloat(style.columnGap) || 0;
  const width = row.firstElementChild?.getBoundingClientRect().width ?? 0;
  const available = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const stride = width + gap;
  const visible = Math.max(1, Math.floor((available + gap + 1) / Math.max(1, stride)));
  return { stride, visible, count: row.children.length };
}

function trailingSpace(row: HTMLUListElement) {
  if (!window.matchMedia("(min-width: 761px)").matches) return 0;
  const { stride, visible, count } = posterLayout(row);
  const remainder = count % visible;
  if (count <= visible || remainder === 0) return 0;
  return (visible - remainder) * stride;
}

function keepNavigationFocus(row: HTMLUListElement, previous: boolean, next: boolean) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !row.parentElement?.contains(active)) return;
  if (active.dataset.posterDirection === "previous" && !previous) row.focus({ preventScroll: true });
  if (active.dataset.posterDirection === "next" && !next) row.focus({ preventScroll: true });
}

function scrollBehavior(): ScrollBehavior {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "instant";
  return "smooth";
}

export function usePosterNavigation() {
  const scroller = useRef<HTMLUListElement>(null);
  const [navigation, setNavigation] = useState(INITIAL_NAVIGATION);
  useEffect(() => {
    const row = scroller.current;
    if (!row) return;
    const update = () => {
      const tail = trailingSpace(row);
      row.style.setProperty("--home-row-tail", `${tail}px`);
      const previous = row.scrollLeft > 1;
      const next = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
      keepNavigationFocus(row, previous, next);
      setNavigation((current) => {
        if (current.previous === previous && current.next === next) return current;
        return { previous, next };
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(row);
    row.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); row.removeEventListener("scroll", update); };
  }, []);
  const move = (direction: number) => {
    const row = scroller.current;
    if (!row) return;
    const { stride, visible, count } = posterLayout(row);
    const page = Math.round(row.scrollLeft / (stride * visible));
    const lastPage = Math.max(0, Math.ceil(count / visible) - 1);
    const targetPage = Math.max(0, Math.min(lastPage, page + direction));
    row.scrollTo({ left: targetPage * visible * stride, behavior: scrollBehavior() });
  };
  return { scroller, navigation, move };
}

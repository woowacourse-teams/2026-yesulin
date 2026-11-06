"use client";
import { useEffect, useEffectEvent } from "react";

export function useReviewExitGuard(enabled: boolean, guard: (action: () => void) => void, push: (href: string) => void) {
  const exit = useEffectEvent((href: string) => guard(() => push(href)));
  useEffect(() => {
    if (!enabled) return;
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || link.target && link.target !== "_self") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault(); event.stopPropagation();
      exit(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [enabled]);
}

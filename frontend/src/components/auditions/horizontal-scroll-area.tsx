"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function HorizontalScrollArea({
  children,
  className = "",
  scrollerClassName = "",
  fadeClassName = "from-card via-card/85",
}: {
  children: React.ReactNode;
  className?: string;
  scrollerClassName?: string;
  fadeClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

  const measure = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    setHasMore(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  return <div className={`relative min-w-0 ${className}`}>
    <div ref={scrollerRef} onScroll={measure} className={`scrollbar-hidden overflow-x-auto ${scrollerClassName}`}>{children}</div>
    {hasMore ? <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent ${fadeClassName}`} /> : null}
  </div>;
}

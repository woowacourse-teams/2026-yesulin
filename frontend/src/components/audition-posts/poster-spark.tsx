"use client";

import { useEffect, useRef } from "react";

const VISIBLE_RATIO = 0.6;

/**
 * 글씨만 있는 카드의 로고 반짝이. 카드가 처음 화면에 들어올 때 한 바퀴 돌고,
 * 마우스를 올리면 다시 한 바퀴 돈다. 마우스를 뗄 때는 돌지 않는다. 움직임 줄이기 설정은 CSS가 막는다.
 */
export function PosterSpark() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const spark = ref.current;
    if (!spark) return;
    const card = spark.closest(".notebook-poster-card");
    const replay = () => spin(spark);
    const stop = () => spark.removeAttribute("data-spinning");
    const observer = card && watchFirstView(card, replay);
    card?.addEventListener("mouseenter", replay);
    spark.addEventListener("animationend", stop);
    return () => { observer?.disconnect(); card?.removeEventListener("mouseenter", replay); spark.removeEventListener("animationend", stop); };
  }, []);
  return <span ref={ref} className="notebook-poster-spark" aria-hidden="true" />;
}

function spin(spark: HTMLElement) {
  spark.removeAttribute("data-spinning");
  void spark.offsetWidth;
  spark.setAttribute("data-spinning", "");
}

function watchFirstView(card: Element, onView: () => void) {
  if (typeof IntersectionObserver === "undefined") return null;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO)) return;
    observer.disconnect();
    onView();
  }, { threshold: VISIBLE_RATIO });
  observer.observe(card);
  return observer;
}

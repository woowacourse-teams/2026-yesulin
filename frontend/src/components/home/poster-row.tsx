"use client";

import Link from "next/link";
import { Children, type ReactNode } from "react";
import { SiteIcon } from "@/components/ui/site-icon";
import { usePosterNavigation } from "./use-poster-navigation";

/** 홈의 가로 포스터 줄. 모바일은 스와이프, 데스크톱은 양옆 버튼으로 넘긴다. */
export function PosterRow({ id, title, moreHref, toolbar, label, fallback, children }: {
  readonly id?: string;
  readonly title: string;
  readonly moreHref?: string;
  readonly toolbar?: ReactNode;
  readonly label: string;
  /** 목록 대신 보여 줄 로딩·오류·빈 상태. */
  readonly fallback?: ReactNode;
  readonly children?: ReactNode;
}) {
  const contentKey = Children.toArray(children).map((child) => {
    if (typeof child === "object" && "key" in child) return child.key;
    return child;
  }).join("|");
  return <section id={id} className="home-row" aria-label={label}>
    <div className="home-row-heading">
      <h2>{title}</h2>
      {moreHref && <Link href={moreHref} className="home-row-more">전체 보기<SiteIcon name="next" size={16} /></Link>}
    </div>
    {toolbar}
    {fallback}
    {!fallback && <PosterScroller key={contentKey} title={title}>{children}</PosterScroller>}
  </section>;
}

function PosterScroller({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const { scroller, navigation, move } = usePosterNavigation();
  return <div className="home-row-body">
    <ul ref={scroller} className="home-row-scroller" tabIndex={0} aria-label={`${title} 포스터 목록`}>{children}</ul>
    <button type="button" hidden={!navigation.previous} className="home-row-arrow is-previous" data-poster-direction="previous" aria-label={`${title} 이전 포스터`} onClick={() => move(-1)}><SiteIcon name="previous" size={20} /></button>
    <button type="button" hidden={!navigation.next} className="home-row-arrow is-next" data-poster-direction="next" aria-label={`${title} 다음 포스터`} onClick={() => move(1)}><SiteIcon name="next" size={20} /></button>
  </div>;
}

export function PosterRowSkeleton({ count = 6 }: { readonly count?: number }) {
  return <ul className="home-row-scroller" role="status" aria-label="포스터 불러오는 중">
    {Array.from({ length: count }, (_, item) => <li key={item}><div className="notebook-poster-skeleton animate-pulse motion-reduce:animate-none" /></li>)}
  </ul>;
}

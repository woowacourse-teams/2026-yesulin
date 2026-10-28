import Link from "next/link";
import type { ReactNode } from "react";
import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { NotebookPageMain } from "@/components/landing/notebook-page-main";
import { FallbackImage } from "@/components/ui/fallback-image";
import { actorPageRoutes } from "@/features/actor-pages/types";

/** 배우 목록·배우 페이지가 함께 쓰는 틀. 배우 페이지에서는 목록으로 돌아가는 링크를 보인다. */
export function ActorPageScreen({ backToList = false, children }: { readonly backToList?: boolean; readonly children: ReactNode }) {
  return (
    <div className="public-notebook">
      <a className="notebook-skip" href="#main">본문으로 바로가기</a>
      <NotebookHeader />
      <NotebookPageMain>
        {backToList ? (
          <Link
            href={actorPageRoutes.list()}
            className="-ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-white hover:text-foreground"
          >
            배우 목록
          </Link>
        ) : null}
        {children}
      </NotebookPageMain>
      <NotebookFooter />
    </div>
  );
}

/** 공개 사본은 저장소 공개 주소를 그대로 쓴다. 세로 3:4 비율로 자른다. */
export function ActorPhoto({ src, alt, className = "" }: { readonly src: string | null; readonly alt: string; readonly className?: string }) {
  return (
    <FallbackImage
      src={src ?? ""}
      alt={alt}
      width={600}
      height={800}
      unoptimized
      className={`block aspect-[3/4] h-auto w-full bg-surface object-cover ${className}`}
    />
  );
}

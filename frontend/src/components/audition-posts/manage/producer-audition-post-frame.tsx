import Link from "next/link";
import type { ReactNode } from "react";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";

/** 기획사 공고 작성·수정 화면 틀. 저장 줄이 화면 가로 여백에 맞춰 붙도록 운영자 작성 화면과 같은 여백을 쓴다. */
export function ProducerAuditionPostFrame({ title, description, children }: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-6 break-keep lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand">내 오디션 공고</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">{title}</h1>
          <p className="mt-2 text-sm text-muted-strong">{description}</p>
        </div>
        <Link href={producerAuditionPostRoutes.list} className="inline-flex min-h-11 items-center rounded-control border border-border bg-white px-4 text-sm font-semibold text-foreground hover:border-brand-line hover:bg-brand-soft">
          목록으로
        </Link>
      </header>
      {children}
    </div>
  );
}

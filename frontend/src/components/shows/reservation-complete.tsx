"use client";

import { useEffect, useRef, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { formatShowFullDateTime } from "@/features/shows/format";
import type { PublicShow, ReservationReceipt } from "@/features/shows/types";
import { ShowPageHeader } from "./show-page-header";

/** 문자 안내가 붙기 전까지는 이 화면이 유일한 예매 확인 수단이라 캡처를 안내한다. */
export function ReservationComplete({ show, receipt, onBack }: {
  readonly show: PublicShow;
  readonly receipt: ReservationReceipt;
  readonly onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(receipt.code);
      setCopyMessage("예매번호를 복사했어요.");
    } catch (cause) {
      console.error("[예매번호 복사 실패]", cause);
      setCopyMessage("복사하지 못했어요. 화면을 캡처해 두세요.");
    }
  };

  return (
    <main className="min-h-screen bg-surface pb-12 text-foreground">
      <ShowPageHeader />
      <div className="mx-auto max-w-[560px] px-5 py-8 md:py-12">
        <section className="rounded-modal border border-border bg-card px-5 py-8 text-center md:px-8">
          <span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pass-bg text-xl font-bold text-pass">✓</span>
          <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold tracking-[-0.025em] focus:outline-none">예매가 완료됐어요</h1>
          <p className="mt-2 text-sm leading-6 text-muted-strong">이 화면을 캡처해 두면 공연 당일 확인이 쉬워요.</p>

          <div className="mt-6 rounded-card border border-brand-line bg-brand-soft px-4 py-5">
            <span className="block text-xs font-semibold text-brand">예매번호</span>
            <strong className="num mt-1 block text-3xl font-bold tracking-[0.12em]">{receipt.code}</strong>
            <SecondaryButton onClick={copyCode} className="mt-3">예매번호 복사</SecondaryButton>
            <p aria-live="polite" className="mt-2 min-h-5 text-xs text-muted">{copyMessage}</p>
          </div>

          <dl className="mt-6 grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-3 text-left text-base">
            <dt className="text-muted">공연</dt><dd className="font-semibold">{receipt.showTitle}</dd>
            <dt className="text-muted">일시</dt><dd className="num">{formatShowFullDateTime(receipt.startsAt)}</dd>
            <dt className="text-muted">장소</dt><dd className="break-words">{show.venue.name}</dd>
            <dt className="text-muted">매수</dt><dd className="num">{receipt.ticketCount}매</dd>
            <dt className="text-muted">예매자</dt><dd>{receipt.bookerName}</dd>
          </dl>

          <p className="mt-6 rounded-control border border-warn/30 bg-warn-bg px-4 py-3 text-left text-sm leading-6 text-foreground">
            취소는 공연 시작 1시간 전까지 <a href={`tel:${show.inquiryPhone.replaceAll("-", "")}`} className="num whitespace-nowrap font-semibold underline underline-offset-2">{show.inquiryPhone}</a>로 전화해 주세요. 예매번호를 알려 주시면 빨리 처리할 수 있어요.
          </p>
        </section>
        <PrimaryButton onClick={onBack} className="mt-6 w-full">공연 정보로 돌아가기</PrimaryButton>
      </div>
    </main>
  );
}

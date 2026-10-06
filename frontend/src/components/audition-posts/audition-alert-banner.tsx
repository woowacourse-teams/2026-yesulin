"use client";

import { trackAnalyticsEvent } from "@/features/analytics/events";
import { AUDITION_ALERT_CHAT_URL } from "@/features/audition-posts/types";

/**
 * 메인 최상단의 공고 알림 안내. 카카오톡 오픈채팅으로 이어지므로 버튼은 카카오 공식 노란색(#FEE500)과
 * 검정 글자를 쓴다. 바탕은 같은 계열의 옅은 노랑으로 목록 카드와 구분한다.
 */
export function AuditionAlertBanner() {
  return (
    <section
      aria-labelledby="audition-alert-title"
      className="relative overflow-hidden rounded-card border border-[#f3dc5b] bg-[#fff9d9] px-5 py-5 sm:px-7 sm:py-6"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#fee500]/50 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fee500] shadow-[var(--shadow-1)]">
            <ChatBubbleIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.02em] text-[#5c4a00]">공고 알림 · 카카오톡 오픈채팅</p>
            <h2 id="audition-alert-title" className="mt-1 text-lg font-bold leading-snug text-[#191919] sm:text-xl">
              새 공고가 올라오면 카톡으로 가장 먼저 알려 드려요
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#4a3f1a]">
              연극·뮤지컬·퍼포먼스·단원·기획사 모집 공고를 오픈채팅방에서 바로 받아 보세요.
            </p>
            <ul aria-label="오픈채팅방 안내" className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-[#4a3f1a]">
              <li className="rounded-full bg-white/80 px-2.5 py-1">새 공고 바로 알림</li>
              <li className="rounded-full bg-white/80 px-2.5 py-1">익명 프로필로 참여</li>
            </ul>
          </div>
        </div>
        <a
          href={AUDITION_ALERT_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackAnalyticsEvent("kakao_openchat_click", { entry_point: "home_alert_banner" })}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-control bg-[#fee500] px-6 text-[15px] font-bold text-[#191919] shadow-[var(--shadow-1)] transition-[background-color,box-shadow,transform] hover:bg-[#f9d900] hover:shadow-[var(--shadow-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191919] active:scale-[0.98] motion-reduce:transition-none"
        >
          <ChatBubbleIcon className="h-4 w-4" />
          오픈채팅 참여하기
          <span className="sr-only">(새 창에서 열림)</span>
        </a>
      </div>
    </section>
  );
}

function ChatBubbleIcon({ className = "h-6 w-6" }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="#191919">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.84 5.31 4.6 6.73l-.93 3.4c-.08.3.26.54.52.37l4.03-2.66c.58.08 1.17.12 1.78.12 5.52 0 10-3.58 10-8S17.52 3 12 3Z" />
    </svg>
  );
}

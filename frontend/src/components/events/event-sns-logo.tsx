import type { EventSnsPlatform } from "@/features/events/types";

/** 명함 예시에 SNS 유형 대신 넣는 단색 로고. 글자 크기(1em)에 맞춰 커진다. */
export function EventSnsLogo({ platform }: { readonly platform: EventSnsPlatform }) {
  return (
    <svg viewBox="0 0 24 24" className="event-card-example-sns-logo" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {platform === "INSTAGRAM" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </>
      ) : platform === "YOUTUBE" ? (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4.5" />
          <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d="M19.5 12a7.5 7.5 0 1 0-3.1 6.1" />
          <circle cx="12" cy="12" r="3" />
          <path d="M15 12v1.4a2.25 2.25 0 0 0 4.5 0V12" />
        </>
      )}
    </svg>
  );
}

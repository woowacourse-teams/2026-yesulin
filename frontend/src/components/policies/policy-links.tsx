import Link from "next/link";
import { AnalyticsSettingsButton } from "@/components/analytics/analytics-settings-button";

const KAKAO_CHAT_URL = "https://pf.kakao.com/_pbTBX/chat";

export function PolicyLinks({ className = "", includeConsent = true, includeContact = true }: { readonly className?: string; readonly includeConsent?: boolean; readonly includeContact?: boolean }) {
  return (
    <nav aria-label="정책 및 문의" className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      <Link href="/terms" className="inline-flex min-h-11 items-center font-medium text-muted-strong hover:text-brand hover:underline">이용약관</Link>
      <Link href="/privacy" className="inline-flex min-h-11 items-center font-medium text-muted-strong hover:text-brand hover:underline">개인정보 처리방침</Link>
      {includeConsent ? <Link href="/privacy/consents" className="inline-flex min-h-11 items-center font-medium text-muted-strong hover:text-brand hover:underline">개인정보 동의문</Link> : null}
      {includeContact ? <a href={KAKAO_CHAT_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-medium text-muted-strong hover:text-brand hover:underline">문의</a> : null}
      <AnalyticsSettingsButton />
    </nav>
  );
}

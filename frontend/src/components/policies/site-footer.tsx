import { PolicyLinks } from "@/components/policies/policy-layout";

/**
 * 공연 예매·배우 화면처럼 랜딩 푸터가 없는 화면의 하단 정책 링크.
 * 처리방침이 안내하는 분석 설정 진입점이 여기에도 있어야 한다.
 * 화면 아래 고정 바가 있으면 className으로 그 높이만큼 아래 여백을 더한다.
 */
export function SiteFooter({ className = "" }: { readonly className?: string }) {
  return (
    <footer className={`border-t border-border bg-white ${className}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-5 py-5 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <PolicyLinks />
        <p>© 2026 예술in 프로젝트팀</p>
      </div>
    </footer>
  );
}

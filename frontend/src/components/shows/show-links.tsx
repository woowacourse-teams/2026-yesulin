import type { ShowLink } from "@/features/shows/types";

/** 서버가 http/https만 저장하지만, 화면에서도 다른 scheme 링크는 만들지 않는다. */
const WEB_URL_PATTERN = /^https?:\/\//i;

/** 공연사가 등록한 안내 링크(SNS, 홈페이지 등). 새 창으로 열고 이 페이지 정보를 넘기지 않는다. */
export function ShowLinkButtons({ links, className = "" }: {
  readonly links: readonly ShowLink[];
  readonly className?: string;
}) {
  const webLinks = links.filter((link) => WEB_URL_PATTERN.test(link.url));
  if (!webLinks.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {webLinks.map((link, index) => (
        <li key={`${index}-${link.url}`} className="min-w-0 max-w-full">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-control border border-brand-line bg-card px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="truncate">{link.label}</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(새 창)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

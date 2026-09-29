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
    <ul className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {webLinks.map((link, index) => {
        const hostname = new URL(link.url).hostname.replace(/^www\./i, "");
        const isInstagram = hostname === "instagram.com";
        const isThreads = hostname === "threads.com" || hostname === "threads.net";
        return (
          <li key={`${index}-${link.url}`} className="min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-28 flex-col justify-between gap-4 rounded-card border border-border bg-card p-4 transition-[border-color,background-color] hover:border-brand-line hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-brand-soft text-brand group-hover:bg-card">
                  {isInstagram ? <InstagramIcon /> : isThreads ? <ThreadsIcon /> : <WebsiteIcon />}
                </span>
                <span className="min-w-0 truncate text-xs font-medium text-muted-strong">{hostname}</span>
              </span>
              <span className="text-base font-semibold leading-6 text-foreground group-hover:text-brand">
                {link.label}
                <span className="sr-only"> (새 창에서 열림)</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ThreadsIcon() {
  return <span className="text-[23px] font-bold leading-none" aria-hidden="true">@</span>;
}

function WebsiteIcon() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9Z" />
    </svg>
  );
}

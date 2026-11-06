import { socialLink } from "@/features/pdf-reviews/social-links";

export function ApplicantSocialLinks({ links, empty = false }: { readonly links: readonly string[]; readonly empty?: boolean }) {
  const visible = links.map(socialLink).filter(link => link !== null);
  if (!visible.length) return empty ? <p className="text-sm text-muted">지원서에서 확인된 링크가 없습니다.</p> : null;
  return <ul aria-label="지원자 SNS·영상 링크" className="flex flex-wrap gap-2">
    {visible.map(link => <li key={link.url} className="min-w-0 max-w-full">
      <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}
        aria-label={`${link.label} 새 창에서 열기`} title={link.url}
        className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-control border border-brand-line bg-brand-soft px-3 text-sm font-semibold text-brand hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <span className="truncate">{link.label}</span><span aria-hidden="true">↗</span>
      </a>
    </li>)}
  </ul>;
}

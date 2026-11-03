import type { IconType } from "react-icons";
import { FaInstagram, FaYoutube, FaThreads, FaTiktok, FaXTwitter, FaFacebookF, FaVimeoV } from "react-icons/fa6";
import { actorExternalLinks, type ActorSocialPlatform } from "@/features/actor-pages/external-links";
import { SiteIcon } from "@/components/ui/site-icon";

const SOCIAL_ICONS: Record<ActorSocialPlatform, IconType> = {
  instagram: FaInstagram, youtube: FaYoutube, threads: FaThreads, tiktok: FaTiktok,
  x: FaXTwitter, facebook: FaFacebookF, vimeo: FaVimeoV,
};

/** 공개 링크만 받는다. 외부 SDK나 계정 조회 없이 로컬 아이콘과 링크를 그린다. */
export function ActorSocialLinks({ links }: { readonly links: readonly { readonly url: string }[] }) {
  const items = actorExternalLinks(links);
  if (!items.length) return null;
  return <nav aria-label="배우 SNS와 외부 링크" className="mt-6 border-t border-border pt-5">
    <p className="mb-3 text-sm font-semibold text-foreground">SNS · 외부 링크</p>
    <ul className="flex min-w-0 flex-wrap gap-2">
      {items.map((link) => {
        const Icon = link.platform ? SOCIAL_ICONS[link.platform] : null;
        return <li key={link.href} className="max-w-full min-w-0">
          <a href={link.href} target="_blank" rel="nofollow ugc noopener noreferrer"
            aria-label={`${link.label} · ${link.address} (새 창에서 열림)`} title={`${link.label} · ${link.address}`}
            className={`inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${Icon ? "w-11" : ""}`}>
            {Icon ? <Icon aria-hidden="true" focusable="false" size={20} className="shrink-0" /> : <><SiteIcon name="link" size={18} className="shrink-0" /><span className="min-w-0 break-all">{link.label}</span></>}
          </a>
        </li>;
      })}
    </ul>
  </nav>;
}

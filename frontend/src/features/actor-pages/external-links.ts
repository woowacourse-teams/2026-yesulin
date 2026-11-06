export type ActorSocialPlatform = "instagram" | "youtube" | "threads" | "tiktok" | "x" | "facebook" | "vimeo";

const SOCIAL_HOSTS: Readonly<Record<string, { platform: ActorSocialPlatform; label: string }>> = {
  "instagram.com": { platform: "instagram", label: "인스타그램" },
  "youtube.com": { platform: "youtube", label: "유튜브" },
  "m.youtube.com": { platform: "youtube", label: "유튜브" },
  "youtu.be": { platform: "youtube", label: "유튜브" },
  "threads.com": { platform: "threads", label: "스레드" },
  "threads.net": { platform: "threads", label: "스레드" },
  "tiktok.com": { platform: "tiktok", label: "틱톡" },
  "x.com": { platform: "x", label: "X" },
  "twitter.com": { platform: "x", label: "X" },
  "facebook.com": { platform: "facebook", label: "페이스북" },
  "m.facebook.com": { platform: "facebook", label: "페이스북" },
  "vimeo.com": { platform: "vimeo", label: "Vimeo" },
};

/** 공개 응답의 URL만 분류한다. 임의 하위 도메인을 브랜드로 간주하지 않는다. */
export function actorExternalLinks(links: readonly { readonly url: string }[]) {
  const seen = new Set<string>();
  return links.flatMap(({ url: value }) => {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || seen.has(url.href)) return [];
      seen.add(url.href);
      const hostname = url.hostname.replace(/^www\./, "");
      const social = Object.hasOwn(SOCIAL_HOSTS, hostname) ? SOCIAL_HOSTS[hostname] : null;
      return [{ href: url.href, platform: social?.platform ?? null, label: social?.label ?? hostname, address: `${url.host}${url.pathname}${url.search}${url.hash}` }];
    } catch {
      return [];
    }
  });
}

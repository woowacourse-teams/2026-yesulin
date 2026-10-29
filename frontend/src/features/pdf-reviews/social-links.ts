export type PdfSocialLink = { readonly url: string; readonly platform: "INSTAGRAM" | "YOUTUBE"; readonly label: string };

/** 명시된 웹 주소만 표시한다. 계정명이나 QR 이미지로부터 URL을 추측하지 않는다. */
export function socialLink(value: string): PdfSocialLink | null {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
    if (host === "instagram.com") {
      const path = url.pathname.split('/').filter(Boolean);
      const account = path[0] && !['p', 'reel', 'reels', 'stories'].includes(path[0]) ? ` · @${path[0]}` : "";
      return { url: url.href, platform: "INSTAGRAM", label: `인스타그램${account}` };
    }
    if (host === "youtube.com" || host === "youtu.be") return { url: url.href, platform: "YOUTUBE", label: "유튜브" };
    return null;
  } catch { return null; }
}

export function extractedSocialLinks(text: string): PdfSocialLink[] {
  const matches = text.matchAll(/(?<![\w@./-])(?:https?:\/\/|(?:www\.)?(?:instagram\.com|youtube\.com|youtu\.be)\/)[^\s<>"'`\u3000]+/gi);
  const links = new Map<string, PdfSocialLink>();
  for (const match of matches) {
    if (match[0].length > 2048) continue;
    const link = socialLink(match[0].replace(/[)\]},.;!?\u3002\uff0c]+$/g, ""));
    if (link) links.set(link.url, link);
  }
  return [...links.values()];
}

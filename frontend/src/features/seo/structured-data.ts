import { SITE_URL } from "@/config/site";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "예술in",
      url: `${SITE_URL}/`,
      description: "뮤지컬·연극 오디션 지원 및 심사 관리 서비스",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/yesulin-logo-mark.png`,
        width: 800,
        height: 320,
      },
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: "예술in",
      inLanguage: "ko-KR",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
} as const;

export function postingBreadcrumbStructuredData(posting: { readonly id: string; readonly performanceTitle: string; readonly title: string }) {
  const postingUrl = `${SITE_URL}/apply/${encodeURIComponent(posting.id)}`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "예술in",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${posting.performanceTitle} ${posting.title}`,
        item: postingUrl,
      },
    ],
  } as const;
}

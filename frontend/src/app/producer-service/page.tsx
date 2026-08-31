import type { Metadata } from "next";
import { ProducerMarketingLanding } from "@/components/landing/producer-marketing-landing";

export const metadata: Metadata = {
  title: "기획사/제작사 서비스",
  description: "공연과 공고, 배우 심사를 한 흐름으로 관리하는 예술in 기획사/제작사 서비스",
  alternates: { canonical: "/producer-service" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/producer-service",
    siteName: "예술in",
    title: "기획사/제작사 서비스 | 예술in",
    description: "공연과 공고, 배우 심사를 한 흐름으로 관리하는 예술in 기획사/제작사 서비스",
    images: [{
      url: "/images/og-image.png",
      width: 1536,
      height: 1024,
      alt: "공연 예술 오디션 지원을 더 간편하게, 예술in",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "기획사/제작사 서비스 | 예술in",
    description: "공연과 공고, 배우 심사를 한 흐름으로 관리하는 예술in 기획사/제작사 서비스",
    images: ["/images/og-image.png"],
  },
};

export default function ProducerServicePage() {
  return <ProducerMarketingLanding />;
}

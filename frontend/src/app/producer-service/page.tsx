import type { Metadata } from "next";
import { ProducerMarketingLanding } from "@/components/landing/producer-marketing-landing";

export const metadata: Metadata = {
  title: "공연사 서비스",
  description: "공연과 공고, 지원자 심사를 한 흐름으로 관리하는 예술in 공연사 서비스",
};

export default function ProducerServicePage() {
  return <ProducerMarketingLanding />;
}

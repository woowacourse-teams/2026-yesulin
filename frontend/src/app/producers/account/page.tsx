import type { Metadata } from "next";
import { ProducerSettings } from "@/components/producers/producer-settings";

export const metadata: Metadata = { title: "공연사 설정" };

export default function ProducerAccountPage() {
  return <ProducerSettings />;
}

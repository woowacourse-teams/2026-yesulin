import type { Metadata } from "next";
import { ProducerDashboard } from "@/components/producers/producer-dashboard";

export const metadata: Metadata = { title: "공연사 대시보드" };

export default function ProducersPage() {
  return <ProducerDashboard />;
}

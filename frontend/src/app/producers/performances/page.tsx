import type { Metadata } from "next";
import { PerformanceList } from "@/components/performances/performance-list";

export const metadata: Metadata = {
  title: "공연 관리",
};

export default function PerformancesPage() {
  return <PerformanceList />;
}

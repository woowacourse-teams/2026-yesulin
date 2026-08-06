import type { Metadata } from "next";
import { PerformancePicker } from "@/components/auditions/performance-picker";

export const metadata: Metadata = {
  title: "공연 관리",
};

export default function PerformancesPage() {
  return <PerformancePicker />;
}

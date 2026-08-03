import type { Metadata } from "next";
import { CreatePerformanceForm } from "@/components/performances/performance-form";

export const metadata: Metadata = {
  title: "공연 등록",
};

export default function NewPerformancePage() {
  return <CreatePerformanceForm />;
}

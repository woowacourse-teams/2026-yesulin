import type { Metadata } from "next";
import { EditPerformanceLoader } from "@/components/performances/edit-performance-loader";

export const metadata: Metadata = {
  title: "공연 수정",
};

export default async function EditPerformancePage({
  params,
}: {
  params: Promise<{ performanceId: string }>;
}) {
  const { performanceId } = await params;
  return <EditPerformanceLoader performanceId={performanceId} />;
}

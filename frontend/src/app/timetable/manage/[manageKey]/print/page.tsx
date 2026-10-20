import type { Metadata } from "next";
import { TimetablePrintSheet } from "@/components/timetables/manage/print-sheet";

export const metadata: Metadata = {
  title: "일정표 출력",
};

export default async function PrintTimetablePage({ params }: { params: Promise<{ manageKey: string }> }) {
  const { manageKey } = await params;
  return <TimetablePrintSheet manageKey={decodeURIComponent(manageKey)} />;
}

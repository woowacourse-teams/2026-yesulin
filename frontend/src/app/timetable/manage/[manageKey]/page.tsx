import type { Metadata } from "next";
import { TimetableManager } from "@/components/timetables/manage/timetable-manager";

export const metadata: Metadata = {
  title: "일정표 관리",
};

export default async function ManageTimetablePage({ params }: { params: Promise<{ manageKey: string }> }) {
  const { manageKey } = await params;
  return <TimetableManager manageKey={decodeURIComponent(manageKey)} />;
}

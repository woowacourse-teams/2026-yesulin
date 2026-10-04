import type { Metadata } from "next";
import { ActorTimetableView } from "@/components/timetables/actor-timetable";

export const metadata: Metadata = {
  title: "내 오디션 일정",
};

export default async function ActorTimetablePage({ params }: { params: Promise<{ accessKey: string }> }) {
  const { accessKey } = await params;
  return <ActorTimetableView accessKey={decodeURIComponent(accessKey)} />;
}

import type { Metadata } from "next";
import { CreateTimetable } from "@/components/timetables/create-timetable";

export const metadata: Metadata = {
  title: "일정표 생성",
};

export default function NewTimetablePage() {
  return <CreateTimetable />;
}

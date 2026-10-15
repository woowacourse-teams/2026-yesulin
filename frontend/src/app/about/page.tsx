import type { Metadata } from "next";
import { NotebookAbout } from "@/components/landing/notebook-about";

export const metadata: Metadata = {
  title: "예술in 소개",
  description: "배우의 새로운 기회와 관객의 새로운 발견. 공연예술의 오디션과 무료 공연을 연결하는 예술in을 소개합니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <NotebookAbout />;
}

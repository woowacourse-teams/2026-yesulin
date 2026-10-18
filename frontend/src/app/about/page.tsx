import type { Metadata } from "next";
import { NotebookAbout } from "@/components/landing/notebook-about";
import { socialMetadata } from "@/features/seo/audition-metadata";

const DESCRIPTION = "배우의 새로운 기회와 관객의 새로운 발견. 공연예술의 오디션과 무료 공연을 연결하는 예술in을 소개합니다.";

export const metadata: Metadata = {
  title: "서비스 소개",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  ...socialMetadata({ title: "서비스 소개 | 예술in", description: DESCRIPTION, url: "/about" }),
};

export default function AboutPage() {
  return <NotebookAbout />;
}

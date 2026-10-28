import type { Metadata } from "next";
import { ActorPagePreviewScreen } from "@/components/actor-pages/actor-page-preview";

export const metadata: Metadata = { title: "배우 페이지 미리보기" };

export default function ActorPagePreviewPage() {
  return <ActorPagePreviewScreen />;
}

import type { Metadata } from "next";
import { TheatreLanding } from "@/components/landing/theatre-landing";

export const metadata: Metadata = {
  title: "당신의 다음 무대",
  description: "오디션을 찾는 순간부터 무대에 오르는 날까지, 배우와 공연을 연결하는 예술in",
  robots: { index: false, follow: true },
};

export default function LandingPage() {
  return <TheatreLanding />;
}

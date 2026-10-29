import type { Metadata } from "next";
import { InternalTestSettings } from "@/components/analytics/internal-test-settings";

export const metadata: Metadata = { title: "팀원 테스트 설정", robots: { index: false, follow: false } };
export default function Page() { return <InternalTestSettings />; }

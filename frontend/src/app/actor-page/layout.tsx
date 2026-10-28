import { MswProvider } from "@/components/mocks/msw-provider";

/** `/@아이디`가 rewrite로 들어오는 내부 경로. 직접 들어오면 next.config가 정규 주소로 보낸다. */
export default function ActorPageLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider>{children}</MswProvider>;
}

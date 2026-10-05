import { MswProvider } from "@/components/mocks/msw-provider";

export default function AuditionPostsLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider>{children}</MswProvider>;
}

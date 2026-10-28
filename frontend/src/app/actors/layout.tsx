import { MswProvider } from "@/components/mocks/msw-provider";

export default function ActorsLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider>{children}</MswProvider>;
}

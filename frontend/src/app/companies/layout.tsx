import { MswProvider } from "@/components/mocks/msw-provider";

export default function CompaniesLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider>{children}</MswProvider>;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyEditRequestRoute } from "@/components/companies/company-edit-request";

const COMPANY_ID = /^[1-9][0-9]{0,17}$/;

export const metadata: Metadata = {
  title: "공연사 정보 수정 요청",
  robots: { index: false, follow: false },
};

export default async function CompanyEditRequestPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  if (!COMPANY_ID.test(companyId)) notFound();
  return <CompanyEditRequestRoute companyId={companyId} />;
}

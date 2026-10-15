import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyRoute } from "@/components/companies/company-detail";
import { companyForServer } from "@/features/companies/server";
import { companyRoutes } from "@/features/companies/types";

const COMPANY_ID = /^[1-9][0-9]{0,17}$/;

export async function generateMetadata({ params }: { params: Promise<{ companyId: string }> }): Promise<Metadata> {
  const { companyId } = await params;
  if (!COMPANY_ID.test(companyId)) notFound();
  const found = await companyForServer(companyId);
  if (found.kind === "missing") notFound();
  const canonical = companyRoutes.detail(companyId);
  if (found.kind === "client-only") return { title: "공연사", alternates: { canonical } };
  const { company } = found;
  const description = company.description?.slice(0, 120)
    || [company.location, "공연사 정보와 공고"].filter(Boolean).join(" · ");
  return {
    title: company.name,
    description,
    alternates: { canonical },
    openGraph: { type: "profile", locale: "ko_KR", url: canonical, siteName: "예술in", title: company.name, description },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  if (!COMPANY_ID.test(companyId)) notFound();
  const found = await companyForServer(companyId);
  if (found.kind === "missing") notFound();
  return (
    <CompanyRoute
      companyId={companyId}
      initial={found.kind === "published" ? { company: found.company, posts: found.posts } : null}
    />
  );
}

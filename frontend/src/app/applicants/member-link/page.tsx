import type { Metadata } from "next";
import { ApplicantPageContainer } from "@/components/applicants/applicant-page-container";
import { MemberLinkCodePanel } from "@/components/applicants/member-link-code-panel";
import { WorkspaceBreadcrumb, WorkspacePageHeading } from "@/components/landing/workspace-page-heading";

export const metadata: Metadata = { title: "명함 회원 연결" };

export default function MemberLinkPage() {
  return <ApplicantPageContainer>
    <WorkspaceBreadcrumb items={[{ label: "마이페이지", href: "/applicants" }, { label: "명함 회원 연결" }]} />
    <WorkspacePageHeading eyebrow="이벤트 명함" title="명함 회원 연결" description="현장에서 연결 코드를 보여주면 명함 신청 내역에 내 계정을 연결할 수 있어요." />
    <MemberLinkCodePanel />
  </ApplicantPageContainer>;
}

import type { ReactNode } from "react";
import { NotebookHeader } from "@/components/landing/notebook-site-layout";
import { PolicyLinks } from "@/components/policies/policy-links";

export function CommunityShell({ children }: { readonly children: ReactNode }) {
  return <div className="public-notebook community-app"><a className="notebook-skip" href="#main">본문으로 바로가기</a><NotebookHeader />
    <main id="main" className="community-main"><div className="community-column">{children}</div></main><CommunityFooter /></div>;
}

export function CommunitySubbar({ children }: { readonly children: ReactNode }) {
  return <div className="community-subbar">{children}</div>;
}

function CommunityFooter() {
  return <footer className="community-footer"><p>© 2026 예술in</p><PolicyLinks className="community-footer-links" includeConsent={false} /></footer>;
}

import type { ReactNode } from "react";

export function ApplicantPageContainer({ children }: { readonly children: ReactNode }) {
  return <div className="notebook-container workspace-page">{children}</div>;
}

import type { ReactNode } from "react";

export function ApplicantPageContainer({ children }: { readonly children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1180px] px-5 py-9 md:px-8 md:py-12">{children}</div>;
}

import { NotebookFooter, NotebookHeader } from "./notebook-site-layout";

export function LandingHeader({ service }: { readonly service: "applicant" | "producer" }) {
  return <NotebookHeader service={service} />;
}

export function LandingFooter() {
  return <NotebookFooter />;
}

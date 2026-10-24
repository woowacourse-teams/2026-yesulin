import Link from "next/link";
import type { ReactNode } from "react";

export function WorkspaceBreadcrumb({ items }: {
  readonly items: readonly { readonly label: string; readonly href?: string }[];
}) {
  return <nav aria-label="현재 위치" className="workspace-breadcrumb">
    <Link href="/">홈</Link>
    {items.map((item) => <span key={item.label}>
      <span aria-hidden="true" className="workspace-breadcrumb-separator">/</span>
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
    </span>)}
  </nav>;
}

export function WorkspacePageHeading({ eyebrow, title, description, action }: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: ReactNode;
  readonly action?: ReactNode;
}) {
  return <header className="workspace-page-heading">
    <div>
      <p className="workspace-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="workspace-description">{description}</div>
    </div>
    {action ? <div className="workspace-heading-action">{action}</div> : null}
  </header>;
}

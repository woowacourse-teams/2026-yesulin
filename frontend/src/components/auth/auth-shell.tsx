import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";

type AuthShellProps = {
  readonly title: React.ReactNode;
  readonly description: React.ReactNode;
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
  readonly intent?: "default" | "application";
  readonly fitViewport?: boolean;
};

export function AuthShell({ title, description, children, footer, intent = "default", fitViewport = false }: AuthShellProps) {
  return <div className="public-notebook">
    <a className="notebook-skip" href="#main">본문으로 바로가기</a>
    <NotebookHeader />
    <main id="main" className={`notebook-container notebook-auth${fitViewport ? " is-compact" : ""}`}>
      <div className="notebook-auth-card">
        <header>
          {intent === "application" ? <p className="mb-3 text-sm font-semibold text-brand">지원서 제출을 위한 로그인</p> : null}
          <h1>{title}</h1>
          <p className="notebook-auth-description">{description}</p>
        </header>
        <div className="mt-7">{children}</div>
        {footer ? <div className="notebook-auth-footer">{footer}</div> : null}
      </div>
    </main>
    <NotebookFooter />
  </div>;
}

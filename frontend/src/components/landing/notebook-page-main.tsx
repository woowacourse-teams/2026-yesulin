import type { ReactNode } from "react";

/** 공개 목록의 너비와 상하 여백을 공유한다. 헤더·푸터는 본문 밖에 둔다. */
export function NotebookPageMain({ children }: { readonly children: ReactNode }) {
  return <main id="main" className="notebook-container notebook-page-main">{children}</main>;
}

/** 목록은 제목과 구분선으로 시작한다. 홈의 섹션 제목과는 별도로 관리한다. */
export function NotebookListHeading({ title }: {
  readonly title: string;
}) {
  return (
    <header className="notebook-list-heading">
      <h1>{title}</h1>
    </header>
  );
}

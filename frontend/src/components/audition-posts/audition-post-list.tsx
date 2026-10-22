import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { NotebookPageMain } from "@/components/landing/notebook-page-main";
import type { AuditionPostPage, AuditionPostQuery } from "@/features/audition-posts/types";
import { AuditionPostListSection } from "./audition-post-list-section";

export function AuditionPostList({ query, initialPage }: {
  readonly query: AuditionPostQuery;
  readonly initialPage: AuditionPostPage | null;
}) {
  return <div className="public-notebook">
    <a className="notebook-skip" href="#main">본문으로 바로가기</a><NotebookHeader />
    <NotebookPageMain>
      <AuditionPostListSection query={query} initialPage={initialPage} />
    </NotebookPageMain><NotebookFooter />
  </div>;
}

import { getPublicPosting } from "./api";
import type { ApplicantApplicationDraftSummary } from "./types";
import { listPublicApplicationDrafts } from "@/features/applications/public-application-draft-store";

export async function getApplicantApplicationDrafts(submittedPostingIds: ReadonlySet<string>): Promise<readonly ApplicantApplicationDraftSummary[]> {
  const drafts = await listPublicApplicationDrafts();
  const summaries: Array<ApplicantApplicationDraftSummary | null> = await Promise.all(drafts.filter((draft) => !submittedPostingIds.has(draft.postingId)).map(async (draft): Promise<ApplicantApplicationDraftSummary | null> => {
    try {
      const posting = await getPublicPosting(draft.postingId);
      const roleNames = draft.roleIds.flatMap((id) => posting.roles.find((role) => role.id === id)?.name ?? []);
      return {
        postingId: draft.postingId,
        performanceTitle: posting.performanceTitle,
        postingTitle: posting.title,
        posterUrl: posting.posterUrl,
        companyName: posting.companyName,
        roleNames,
        updatedAt: draft.updatedAt,
        postingStatus: posting.status,
      };
    } catch {
      return null;
    }
  }));
  return summaries.filter((draft): draft is ApplicantApplicationDraftSummary => draft !== null).toSorted((left, right) => right.updatedAt - left.updatedAt);
}

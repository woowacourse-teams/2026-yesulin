import "server-only";
import { publicPostingForServer } from "@/features/applications/public-posting-server";
import { applicationReturnTarget, authCancelReturnTo } from "./return-to";

export type ApplicationAuthContext = {
  readonly performanceTitle?: string;
  readonly postingTitle?: string;
  readonly roleName?: string;
  readonly cancelHref: string;
};

export async function applicationAuthContextForServer(returnTo?: string): Promise<ApplicationAuthContext | null> {
  const target = applicationReturnTarget(returnTo);
  const cancelHref = authCancelReturnTo(returnTo);
  if (!target || !cancelHref) return null;
  const posting = await publicPostingForServer(target.postingId);
  if (!posting) return { cancelHref };
  const roleNames = target.roleIds.flatMap((id) => {
    const role = posting.roles.find((candidate) => candidate.id === id);
    return role ? [role.name] : [];
  });
  return {
    performanceTitle: posting.performanceTitle,
    postingTitle: posting.title,
    ...(roleNames.length ? { roleName: roleNames.join(" · ") } : {}),
    cancelHref,
  };
}

import { ActorBookmarksProvider } from "@/components/actor-pages/actor-bookmarks";
import { ToastProvider } from "@/components/auditions/toast";
import { MswProvider } from "@/components/mocks/msw-provider";

export default function ActorsLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider><ToastProvider><ActorBookmarksProvider>{children}</ActorBookmarksProvider></ToastProvider></MswProvider>;
}

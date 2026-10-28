import { MissingActorPage } from "@/components/actor-pages/actor-page-detail";
import { ActorPageScreen } from "@/components/actor-pages/actor-page-screen";

export default function ActorPageNotFound() {
  return <ActorPageScreen backToList><MissingActorPage /></ActorPageScreen>;
}

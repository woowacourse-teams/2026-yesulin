import { producerAuditionPostRoutes } from "@/features/audition-posts/types";

export function openProducerWorkspace() {
  window.location.assign(producerAuditionPostRoutes.list);
}

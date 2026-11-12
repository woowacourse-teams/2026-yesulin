import { producerAuditionPostRoutes } from "@/features/audition-posts/types";

export const PRODUCER_LOGIN_PATH = "/producer-service/login";

export function openProducerWorkspace() {
  window.location.assign(producerAuditionPostRoutes.list);
}

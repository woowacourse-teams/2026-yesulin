export const PRODUCER_DASHBOARD_PATH = "/producers";
export const PRODUCER_LOGIN_PATH = "/producer-service/login";

export function openProducerWorkspace() {
  window.location.assign(PRODUCER_DASHBOARD_PATH);
}

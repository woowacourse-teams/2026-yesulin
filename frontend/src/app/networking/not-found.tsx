import { EventScreen } from "@/components/events/event-screen";
import { ContentState } from "@/components/ui/content-state";

export default function NetworkingNotFound() {
  return <EventScreen><ContentState headingLevel={1} title="명함을 찾을 수 없어요" description="QR 주소를 다시 확인해 주세요." /></EventScreen>;
}

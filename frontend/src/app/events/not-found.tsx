import { MissingEvent } from "@/components/events/event-detail";
import { EventScreen } from "@/components/events/event-screen";

export default function EventNotFound() {
  return <EventScreen backToList><MissingEvent /></EventScreen>;
}

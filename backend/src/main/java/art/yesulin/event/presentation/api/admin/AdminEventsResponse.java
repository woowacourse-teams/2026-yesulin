package art.yesulin.event.presentation.api.admin;

import art.yesulin.event.application.AdminEventResult;
import java.util.List;

public record AdminEventsResponse(List<AdminEventResult> events) {
}

package art.yesulin.show.presentation.api.reservation;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ChangeTicketCountRequest(@Min(1) @Max(10) int ticketCount) {
}

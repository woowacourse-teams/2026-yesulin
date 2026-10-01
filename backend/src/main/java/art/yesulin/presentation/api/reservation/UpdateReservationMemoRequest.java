package art.yesulin.presentation.api.reservation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 빈 문자열이면 메모를 지운다. */
public record UpdateReservationMemoRequest(@NotNull @Size(max = 300) String memo) {
}

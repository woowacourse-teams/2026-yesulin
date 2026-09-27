package art.yesulin.presentation.api.show;

import art.yesulin.application.reservation.ReserveCommand;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateReservationRequest(
        @NotBlank @Size(max = 50) String bookerName,
        @NotBlank @Pattern(regexp = "\\d{3}-\\d{4}-\\d{4}", message = "휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.")
        String bookerPhone,
        @Min(1) @Max(10) int ticketCount,
        boolean privacyAgreed
) {

    ReserveCommand toCommand() {
        return new ReserveCommand(bookerName, bookerPhone, ticketCount, privacyAgreed);
    }
}

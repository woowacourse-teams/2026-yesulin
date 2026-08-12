package art.yesulin.presentation.recruitment;

import art.yesulin.application.recruitment.PerformanceCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerformanceRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200) String venue,
        @Size(max = 2048) String posterUrl) {

    PerformanceCommand toCommand() {
        return new PerformanceCommand(title, venue, posterUrl);
    }
}

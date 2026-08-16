package art.yesulin.presentation.api.performance;

import art.yesulin.application.performance.UpdatePerformancePosterCommand;
import jakarta.validation.constraints.Positive;

public record UpdatePerformancePosterRequest(@Positive long posterFileId) {

    public UpdatePerformancePosterCommand toCommand() {
        return new UpdatePerformancePosterCommand(posterFileId);
    }
}

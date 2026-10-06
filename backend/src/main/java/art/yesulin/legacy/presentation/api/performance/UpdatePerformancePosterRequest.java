package art.yesulin.legacy.presentation.api.performance;

import art.yesulin.legacy.application.performance.UpdatePerformancePosterCommand;
import jakarta.validation.constraints.Positive;

public record UpdatePerformancePosterRequest(@Positive long posterFileId) {

    public UpdatePerformancePosterCommand toCommand() {
        return new UpdatePerformancePosterCommand(posterFileId);
    }
}

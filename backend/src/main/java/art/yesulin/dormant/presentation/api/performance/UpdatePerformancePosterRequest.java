package art.yesulin.dormant.presentation.api.performance;

import art.yesulin.dormant.application.performance.UpdatePerformancePosterCommand;
import jakarta.validation.constraints.Positive;

public record UpdatePerformancePosterRequest(@Positive long posterFileId) {

    public UpdatePerformancePosterCommand toCommand() {
        return new UpdatePerformancePosterCommand(posterFileId);
    }
}

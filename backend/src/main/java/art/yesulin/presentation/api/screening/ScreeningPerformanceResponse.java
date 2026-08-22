package art.yesulin.presentation.api.screening;

import art.yesulin.application.screening.ScreeningPerformanceResult;

public record ScreeningPerformanceResponse(long id, String posterUrl, String title) {

    static ScreeningPerformanceResponse from(ScreeningPerformanceResult result, String posterUrl) {
        return new ScreeningPerformanceResponse(result.id(), posterUrl, result.title());
    }
}

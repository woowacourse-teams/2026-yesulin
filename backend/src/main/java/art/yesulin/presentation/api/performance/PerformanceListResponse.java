package art.yesulin.presentation.api.performance;

import java.util.List;

public record PerformanceListResponse(List<PerformanceResponse> performances) {

    public PerformanceListResponse {
        performances = List.copyOf(performances);
    }
}

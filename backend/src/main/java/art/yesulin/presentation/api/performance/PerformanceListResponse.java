package art.yesulin.presentation.api.performance;

import java.util.List;

public record PerformanceListResponse(List<PerformanceManagementResponse> performances) {

    public PerformanceListResponse {
        performances = List.copyOf(performances);
    }
}

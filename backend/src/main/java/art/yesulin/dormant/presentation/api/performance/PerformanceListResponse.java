package art.yesulin.dormant.presentation.api.performance;

import java.util.List;

public record PerformanceListResponse(List<PerformanceManagementResponse> performances) {

    public PerformanceListResponse {
        performances = List.copyOf(performances);
    }
}

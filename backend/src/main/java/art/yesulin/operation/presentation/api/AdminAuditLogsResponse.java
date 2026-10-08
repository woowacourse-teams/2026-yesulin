package art.yesulin.operation.presentation.api;

import java.util.List;

public record AdminAuditLogsResponse(
        List<AdminAuditLogResponse> logs,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}

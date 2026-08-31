package art.yesulin.presentation.api.admin;

import java.util.List;

public record AdminAuditLogsResponse(
        List<AdminAuditLogResponse> logs,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}

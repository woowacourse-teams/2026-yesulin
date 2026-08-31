package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.log.LogLines;
import java.time.Instant;
import java.util.List;

public record AdminLogResponse(
        List<String> lines,
        List<AdminLogEntryResponse> entries,
        boolean truncated,
        boolean available,
        Instant readAt
) {

    public static AdminLogResponse from(LogLines logLines) {
        return new AdminLogResponse(
                logLines.lines(),
                logLines.entries().stream().map(AdminLogEntryResponse::from).toList(),
                logLines.truncated(),
                logLines.available(),
                logLines.readAt()
        );
    }
}

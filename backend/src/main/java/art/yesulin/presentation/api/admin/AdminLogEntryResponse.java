package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.log.LogEntry;
import art.yesulin.application.admin.log.LogEntryFormat;
import java.time.Instant;
import java.util.Map;

public record AdminLogEntryResponse(
        LogEntryFormat format,
        Instant timestamp,
        String level,
        String logger,
        String thread,
        String requestId,
        String message,
        Map<String, Object> attributes,
        String raw
) {

    public static AdminLogEntryResponse from(LogEntry entry) {
        return new AdminLogEntryResponse(
                entry.format(),
                entry.timestamp(),
                entry.level(),
                entry.logger(),
                entry.thread(),
                entry.requestId(),
                entry.message(),
                entry.attributes(),
                entry.raw()
        );
    }
}

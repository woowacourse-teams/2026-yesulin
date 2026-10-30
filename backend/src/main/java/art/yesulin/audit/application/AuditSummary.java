package art.yesulin.audit.application;

import java.time.Instant;

public record AuditSummary(String id, String title, Instant createdAt, long roleCount, long entryCount) {
}

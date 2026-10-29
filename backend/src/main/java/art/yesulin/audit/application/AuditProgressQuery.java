package art.yesulin.audit.application;

import java.time.Instant;

public interface AuditProgressQuery {

    AuditProgress find(long ownerId, String reviewId, Instant expiredBefore);
}

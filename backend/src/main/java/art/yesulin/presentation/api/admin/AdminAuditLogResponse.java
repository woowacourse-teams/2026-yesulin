package art.yesulin.presentation.api.admin;

import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import java.time.Instant;

public record AdminAuditLogResponse(
        long id,
        long actorMemberId,
        AdminAction action,
        String targetType,
        long targetId,
        String detail,
        Instant createdAt
) {

    public static AdminAuditLogResponse from(AdminAuditLog log) {
        return new AdminAuditLogResponse(
                log.getId(),
                log.getActorMemberId(),
                log.getAction(),
                log.getTargetType(),
                log.getTargetId(),
                log.getDetail(),
                log.getCreatedAt()
        );
    }
}

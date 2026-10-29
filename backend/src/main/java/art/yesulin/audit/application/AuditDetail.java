package art.yesulin.audit.application;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditRole;
import java.time.Instant;
import java.util.List;

public record AuditDetail(
        String id,
        String title,
        Instant createdAt,
        List<RoleView> roles,
        List<AuditApplicantView> entries
) {

    public static AuditDetail of(Audit review, List<AuditApplicant> entries) {
        return new AuditDetail(review.getId(), review.getTitle(), review.getCreatedAt(),
                review.getRoles().stream().map(RoleView::of).toList(),
                entries.stream().map(AuditApplicantView::of).toList());
    }

    public record RoleView(String id, String name) {

        public static RoleView of(AuditRole role) {
            return new RoleView(role.getId(), role.getName());
        }
    }
}

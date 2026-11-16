package art.yesulin.audit.application;

import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_RESET_FORBIDDEN;

import art.yesulin.global.exception.BusinessException;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yesulin.pdf-review")
public record AuditResetPolicy(Set<Long> resetAllowedMemberIds) {

    public AuditResetPolicy {
        if (resetAllowedMemberIds == null) {
            resetAllowedMemberIds = Set.of();
        }
        resetAllowedMemberIds = Set.copyOf(resetAllowedMemberIds);
    }

    public void requireAllowed(long memberId) {
        if (!resetAllowedMemberIds.contains(memberId)) {
            throw new BusinessException(PDF_REVIEW_RESET_FORBIDDEN, "초기화할 수 있는 시연 계정이 아닙니다.");
        }
    }
}

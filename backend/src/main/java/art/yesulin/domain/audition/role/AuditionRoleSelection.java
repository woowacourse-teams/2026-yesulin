package art.yesulin.domain.audition.role;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

public record AuditionRoleSelection(
        long performanceRoleId,
        AuditionRoleCondition condition
) {

    public AuditionRoleSelection {
        requirePositive(performanceRoleId, "공연 배역 ID는 1 이상이어야 합니다.");
        requireNonNull(condition, "배역 모집 조건은 필수입니다.");
    }
}

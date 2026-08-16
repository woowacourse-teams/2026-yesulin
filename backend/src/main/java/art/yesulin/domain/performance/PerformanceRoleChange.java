package art.yesulin.domain.performance;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

public record PerformanceRoleChange(Long id, String name, String description) {

    public PerformanceRoleChange {
        if (id != null) {
            id = requirePositive(id, "배역 ID는 1 이상이어야 합니다.");
        }
        name = requireText(name, "배역 이름은 필수입니다.");
        description = requireSingleLine(description);
    }

    private static String requireSingleLine(String value) {
        String normalized = requireText(value, "배역 한 줄 설명은 필수입니다.");
        if (normalized.contains("\n") || normalized.contains("\r")) {
            throw new IllegalArgumentException("배역 설명은 한 줄로 작성해야 합니다.");
        }
        return normalized;
    }
}

package art.yesulin.domain.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.DUPLICATE_ROLE_NAME;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceRoles {

    @OneToMany(mappedBy = "performance", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("roleOrder ASC")
    private List<PerformanceRole> values = new ArrayList<>();

    PerformanceRole add(Performance performance, String name, String description) {
        validateDuplicateName(name);
        PerformanceRole role = new PerformanceRole(performance, name, description, values.size());
        values.add(role);
        return role;
    }

    private void validateDuplicateName(String name) {
        if (values.stream().anyMatch(role -> role.hasSameName(name))) {
            throw new BusinessException(DUPLICATE_ROLE_NAME, "같은 이름의 배역을 추가할 수 없습니다.");
        }
    }

    List<PerformanceRole> values() {
        return List.copyOf(values);
    }
}

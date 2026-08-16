package art.yesulin.domain.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.DUPLICATE_ROLE_NAME;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceRoles {

    @OneToMany(mappedBy = "performance", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "role_order")
    private List<PerformanceRole> values = new ArrayList<>();

    void add(Performance performance, String name, String description) {
        validateDuplicateName(name);
        values.add(new PerformanceRole(performance, name, description));
    }

    List<PerformanceRole> values() {
        return List.copyOf(values);
    }

    private void validateDuplicateName(String name) {
        if (values.stream().anyMatch(role -> role.hasSameName(name))) {
            throw new BusinessException(DUPLICATE_ROLE_NAME, "같은 이름의 배역을 추가할 수 없습니다.");
        }
    }
}

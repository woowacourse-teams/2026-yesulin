package art.yesulin.domain.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.DUPLICATE_ROLE_NAME;
import static art.yesulin.domain.performance.PerformanceErrorCode.ROLE_NOT_FOUND;

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
        validateDuplicateName(null, name);
        PerformanceRole role = new PerformanceRole(performance, name, description, values.size());
        values.add(role);
        return role;
    }

    PerformanceRole update(long roleId, String name, String description) {
        PerformanceRole role = findRole(roleId);
        validateDuplicateName(role, name);
        role.update(name, description);
        return role;
    }

    void remove(long roleId) {
        values.remove(findRole(roleId));
        for (int index = 0; index < values.size(); index++) {
            values.get(index).changeOrder(index);
        }
    }

    private PerformanceRole findRole(long roleId) {
        return values.stream()
                .filter(role -> role.getId() == roleId)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ROLE_NOT_FOUND, "공연에서 배역을 찾을 수 없습니다."));
    }

    private void validateDuplicateName(PerformanceRole target, String name) {
        if (values.stream().anyMatch(role -> role != target && role.hasSameName(name))) {
            throw new BusinessException(DUPLICATE_ROLE_NAME, "같은 이름의 배역을 추가할 수 없습니다.");
        }
    }

    List<PerformanceRole> values() {
        return List.copyOf(values);
    }
}

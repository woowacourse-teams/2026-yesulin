package art.yesulin.domain.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.DUPLICATE_ROLE_ID;
import static art.yesulin.domain.performance.PerformanceErrorCode.DUPLICATE_ROLE_NAME;
import static art.yesulin.domain.performance.PerformanceErrorCode.ROLE_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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

    void replace(Performance performance, List<PerformanceRoleChange> changes) {
        validateChanges(changes);
        Map<Long, PerformanceRole> savedRoles = new HashMap<>();
        values.forEach(role -> savedRoles.put(role.getId(), role));

        List<PerformanceRole> replacedRoles = new ArrayList<>();
        for (PerformanceRoleChange change : changes) {
            PerformanceRole role = findOrCreate(performance, savedRoles, change);
            role.update(change);
            replacedRoles.add(role);
        }
        values.clear();
        values.addAll(replacedRoles);
    }

    private PerformanceRole findOrCreate(
            Performance performance,
            Map<Long, PerformanceRole> savedRoles,
            PerformanceRoleChange change
    ) {
        if (change.id() == null) {
            return new PerformanceRole(performance, change.name(), change.description());
        }
        PerformanceRole role = savedRoles.remove(change.id());
        if (role == null) {
            throw new BusinessException(ROLE_NOT_FOUND, "공연에서 수정할 배역을 찾을 수 없습니다.");
        }
        return role;
    }

    private void validateChanges(List<PerformanceRoleChange> changes) {
        Set<Long> ids = new HashSet<>();
        Set<String> names = new HashSet<>();
        for (PerformanceRoleChange change : changes) {
            if (change.id() != null && !ids.add(change.id())) {
                throw new BusinessException(DUPLICATE_ROLE_ID, "같은 배역 ID를 중복해서 요청할 수 없습니다.");
            }
            if (!names.add(change.name().toLowerCase(Locale.ROOT))) {
                throw new BusinessException(DUPLICATE_ROLE_NAME, "같은 이름의 배역을 추가할 수 없습니다.");
            }
        }
    }

    private void validateDuplicateName(String name) {
        if (values.stream().anyMatch(role -> role.hasSameName(name))) {
            throw new BusinessException(DUPLICATE_ROLE_NAME, "같은 이름의 배역을 추가할 수 없습니다.");
        }
    }
}

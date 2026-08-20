package art.yesulin.domain.audition.role;

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
public class AuditionRoles {

    @OneToMany(mappedBy = "roleSection", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "role_order")
    private List<AuditionRole> values = new ArrayList<>();

    void replace(AuditionRoleSection roleSection, List<AuditionRoleSelection> selections) {
        List<AuditionRole> orderedRoles = selections.stream()
                .map(selection -> resolve(roleSection, selection))
                .toList();
        values.clear();
        values.addAll(orderedRoles);
    }

    private AuditionRole resolve(AuditionRoleSection roleSection, AuditionRoleSelection selection) {
        AuditionRole role = values.stream()
                .filter(candidate -> candidate.comesFrom(selection.performanceRoleId()))
                .findFirst()
                .orElse(null);
        if (role == null) {
            return new AuditionRole(roleSection, selection);
        }
        role.updateCondition(selection.condition());
        return role;
    }

    List<AuditionRole> values() {
        return List.copyOf(values);
    }
}

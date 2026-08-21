package art.yesulin.domain.audition.role;

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
public class AuditionRoles {

    @OneToMany(mappedBy = "roleSection", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("order ASC")
    private List<AuditionRole> values = new ArrayList<>();

    void replace(AuditionRoleSection roleSection, List<AuditionRoleSelection> selections) {
        List<AuditionRole> orderedRoles = new ArrayList<>(selections.size());
        for (int order = 0; order < selections.size(); order++) {
            orderedRoles.add(resolve(roleSection, selections.get(order), order));
        }
        values.clear();
        values.addAll(orderedRoles);
    }

    private AuditionRole resolve(AuditionRoleSection roleSection, AuditionRoleSelection selection, int order) {
        AuditionRole role = values.stream()
                .filter(candidate -> candidate.comesFrom(selection.performanceRoleId()))
                .findFirst()
                .orElse(null);
        if (role == null) {
            return new AuditionRole(roleSection, selection, order);
        }
        role.update(selection.condition(), order);
        return role;
    }

    List<AuditionRole> values() {
        return List.copyOf(values);
    }
}

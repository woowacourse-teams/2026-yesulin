package art.yesulin.domain.audition.role;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_role_sections", uniqueConstraints = {
        @UniqueConstraint(name = "uk_audition_role_sections_audition_id", columnNames = "audition_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionRoleSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audition_id", nullable = false, updatable = false)
    private long auditionId;

    @Column(name = "multiple_role_applications_allowed", nullable = false)
    private boolean multipleRoleApplicationsAllowed;

    @Getter(AccessLevel.NONE)
    @Embedded
    private AuditionRoles roles = new AuditionRoles();

    public AuditionRoleSection(long auditionId, AuditionRoleSelections selections) {
        this.auditionId = requirePositive(auditionId, "공고 ID는 1 이상이어야 합니다.");
        replace(selections);
    }

    public AuditionRoleSection replace(AuditionRoleSelections selections) {
        roles.replace(this, selections.values());
        this.multipleRoleApplicationsAllowed = selections.allowsMultipleApplications();
        return this;
    }

    public List<AuditionRole> getRoles() {
        return roles.values();
    }
}

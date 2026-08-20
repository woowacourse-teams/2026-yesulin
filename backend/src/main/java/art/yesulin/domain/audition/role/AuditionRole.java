package art.yesulin.domain.audition.role;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_roles", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_audition_roles_section_performance_role",
                columnNames = {"role_section_id", "performance_role_id"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_section_id", nullable = false)
    private AuditionRoleSection roleSection;

    @Column(name = "performance_role_id", nullable = false, updatable = false)
    private long performanceRoleId;

    @Embedded
    private AuditionRoleCondition condition;

    AuditionRole(AuditionRoleSection roleSection, AuditionRoleSelection selection) {
        this.roleSection = requireNonNull(roleSection, "배역 섹션은 필수입니다.");
        AuditionRoleSelection safeSelection = requireNonNull(selection, "공고 배역 정보는 필수입니다.");
        this.performanceRoleId = safeSelection.performanceRoleId();
        this.condition = safeSelection.condition();
    }

    void updateCondition(AuditionRoleCondition condition) {
        this.condition = requireNonNull(condition, "배역 모집 조건은 필수입니다.");
    }

    boolean comesFrom(long performanceRoleId) {
        return this.performanceRoleId == performanceRoleId;
    }
}

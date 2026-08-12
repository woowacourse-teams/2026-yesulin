package art.yesulin.infrastructure.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "application_roles")
@IdClass(ApplicationRoleId.class)
public class ApplicationRoleJpaEntity {

    @Id
    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Id
    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "role_snapshot", nullable = false, columnDefinition = "json")
    private String roleSnapshot;

    protected ApplicationRoleJpaEntity() {
    }

    public ApplicationRoleJpaEntity(Long applicationId, Long roleId, String roleSnapshot) {
        this.applicationId = applicationId;
        this.roleId = roleId;
        this.roleSnapshot = roleSnapshot;
    }
}

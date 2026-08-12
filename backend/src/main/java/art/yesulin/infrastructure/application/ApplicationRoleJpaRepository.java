package art.yesulin.infrastructure.application;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRoleJpaRepository
        extends JpaRepository<ApplicationRoleJpaEntity, ApplicationRoleId> {
}

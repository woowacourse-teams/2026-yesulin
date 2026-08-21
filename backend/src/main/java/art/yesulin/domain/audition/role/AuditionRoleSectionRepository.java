package art.yesulin.domain.audition.role;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditionRoleSectionRepository extends JpaRepository<AuditionRoleSection, Long> {

    Optional<AuditionRoleSection> findByAuditionId(long auditionId);

    @Query("select section.auditionId from AuditionRole role join role.roleSection section where role.id = :roleId")
    Optional<Long> findAuditionIdByRoleId(@Param("roleId") long roleId);
}

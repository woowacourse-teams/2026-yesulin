package art.yesulin.infrastructure.screening.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ScreeningSubmissionJpaRepository extends JpaRepository<ScreeningSubmissionEntity, Long> {

    @Query("""
            select distinct submission
            from ScreeningSubmissionEntity submission join submission.roleIds roleId
            where submission.auditionId = :auditionId and roleId = :roleId
            order by submission.submittedAt, submission.id
            """)
    List<ScreeningSubmissionEntity> findAll(
            @Param("auditionId") long auditionId,
            @Param("roleId") long roleId
    );
}

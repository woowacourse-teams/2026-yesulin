package art.yesulin.domain.screening;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningCompletionRepository extends JpaRepository<ScreeningCompletion, Long> {

    boolean existsByAuditionRoleId(long auditionRoleId);
}

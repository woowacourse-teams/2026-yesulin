package art.yesulin.domain.screening;

import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningCompletionRepository extends JpaRepository<ScreeningCompletion, Long> {

    boolean existsByAuditionRoleId(long auditionRoleId);

    void deleteByAuditionRoleIdIn(Collection<Long> auditionRoleIds);
}

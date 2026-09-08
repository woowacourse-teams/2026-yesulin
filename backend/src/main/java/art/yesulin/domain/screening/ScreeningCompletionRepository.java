package art.yesulin.domain.screening;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningCompletionRepository extends JpaRepository<ScreeningCompletion, Long> {

    List<ScreeningCompletion> findAllByAuditionRoleId(long auditionRoleId);

    void deleteByAuditionRoleIdIn(Collection<Long> auditionRoleIds);
}

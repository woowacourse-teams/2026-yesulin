package art.yesulin.infrastructure.recruitment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostingJpaRepository extends JpaRepository<PostingJpaEntity, Long> {

    Optional<PostingJpaEntity> findBySourceId(String sourceId);

    List<PostingJpaEntity> findAllByPerformanceIdOrderById(Long performanceId);
}

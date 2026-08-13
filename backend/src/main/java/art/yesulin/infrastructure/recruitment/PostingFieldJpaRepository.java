package art.yesulin.infrastructure.recruitment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostingFieldJpaRepository extends JpaRepository<PostingFieldJpaEntity, Long> {

    Optional<PostingFieldJpaEntity> findByPostingIdAndFieldKey(Long postingId, String fieldKey);

    List<PostingFieldJpaEntity> findAllByPostingIdOrderByDisplayOrder(Long postingId);

    void deleteAllByPostingId(Long postingId);
}

package art.yesulin.event.domain.image;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventImageUploadRepository extends JpaRepository<EventImageUpload, Long> {

    Optional<EventImageUpload> findByObjectKey(String objectKey);

    List<EventImageUpload> findAllByCreatedAtBeforeOrderByIdAsc(Instant createdAt, Pageable pageable);
}

package art.yesulin.event.domain.registration;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRegistrationPhotoUploadRepository extends JpaRepository<EventRegistrationPhotoUpload, Long> {

    Optional<EventRegistrationPhotoUpload> findByObjectKey(String objectKey);

    List<EventRegistrationPhotoUpload> findAllByCreatedAtBeforeOrderByIdAsc(Instant createdAt, Pageable pageable);
}

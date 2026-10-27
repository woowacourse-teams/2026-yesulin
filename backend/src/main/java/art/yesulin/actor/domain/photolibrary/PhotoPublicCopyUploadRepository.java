package art.yesulin.actor.domain.photolibrary;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoPublicCopyUploadRepository extends JpaRepository<PhotoPublicCopyUpload, Long> {

    Optional<PhotoPublicCopyUpload> findByObjectKey(String objectKey);

    List<PhotoPublicCopyUpload> findAllByCreatedAtBeforeOrderByIdAsc(Instant createdAt, Pageable pageable);
}

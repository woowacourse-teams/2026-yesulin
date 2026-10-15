package art.yesulin.company.domain.photo;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyPhotoUploadRepository extends JpaRepository<CompanyPhotoUpload, Long> {

    Optional<CompanyPhotoUpload> findByObjectKey(String objectKey);

    List<CompanyPhotoUpload> findAllByCreatedAtBeforeOrderByIdAsc(Instant createdAt, Pageable pageable);
}

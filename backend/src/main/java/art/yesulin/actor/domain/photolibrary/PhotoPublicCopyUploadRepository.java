package art.yesulin.actor.domain.photolibrary;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PhotoPublicCopyUploadRepository extends JpaRepository<PhotoPublicCopyUpload, Long> {

    /** 확정하는 동안 정리 작업이 같은 업로드를 지우지 못하게 잠근다. 먼저 끝낸 쪽이 기록을 지우면 나중 쪽은 찾지 못한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PhotoPublicCopyUpload> findByObjectKey(String objectKey);

    /** 정리하는 동안 같은 업로드를 사진에 확정하지 못하게 {@link #findByObjectKey(String)}와 같은 잠금을 건다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<PhotoPublicCopyUpload> findAllByCreatedAtBeforeOrderByIdAsc(Instant createdAt, Pageable pageable);
}

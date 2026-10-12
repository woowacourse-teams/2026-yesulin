package art.yesulin.auditionpost.domain.upload;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface AuditionPostUploadRepository extends JpaRepository<AuditionPostUpload, Long> {

    /** 같은 업로드를 두 공고가 동시에 확정하지 않도록 잠근다. 먼저 확정한 쪽이 기록을 지우면 나중 쪽은 찾지 못한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuditionPostUpload> findByObjectKey(String objectKey);

    /** 정리하는 동안 같은 업로드를 공고에 확정하지 못하게 {@link #findByObjectKey(String)}와 같은 잠금을 건다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<AuditionPostUpload> findAllByCreatedAtBeforeOrderByIdAsc(Instant before, Pageable pageable);
}

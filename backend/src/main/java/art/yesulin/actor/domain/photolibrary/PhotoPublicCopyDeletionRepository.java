package art.yesulin.actor.domain.photolibrary;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoPublicCopyDeletionRepository extends JpaRepository<PhotoPublicCopyDeletion, Long> {

    boolean existsByObjectKey(String objectKey);

    List<PhotoPublicCopyDeletion> findAllByOrderByIdAsc(Pageable pageable);
}

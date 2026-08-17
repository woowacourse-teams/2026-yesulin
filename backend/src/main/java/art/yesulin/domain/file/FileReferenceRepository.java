package art.yesulin.domain.file;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileReferenceRepository extends JpaRepository<FileReference, Long> {

    Optional<FileReference> findByReferenceTypeAndReferenceIdAndFileId(
            String referenceType,
            long referenceId,
            long fileId
    );

    boolean existsByReferenceTypeAndReferenceIdAndFileId(String referenceType, long referenceId, long fileId);

    long deleteByReferenceTypeAndReferenceIdAndFileId(String referenceType, long referenceId, long fileId);
}

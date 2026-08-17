package art.yesulin.domain.file;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileReferenceRepository extends JpaRepository<FileReference, Long> {

    Optional<FileReference> findByReferenceTypeAndReferenceIdAndReferenceSlot(
            String referenceType,
            long referenceId,
            String referenceSlot
    );
}

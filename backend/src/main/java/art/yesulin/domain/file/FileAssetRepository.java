package art.yesulin.domain.file;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileAssetRepository extends JpaRepository<FileAsset, Long> {

    Optional<FileAsset> findByIdAndOwnerId(long id, long ownerId);

    List<FileAsset> findAllByIdInAndOwnerId(Collection<Long> ids, long ownerId);
}

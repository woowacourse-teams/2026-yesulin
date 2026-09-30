package art.yesulin.domain.file;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface FileAssetRepository extends JpaRepository<FileAsset, Long> {

    Optional<FileAsset> findByIdAndOwnerId(long id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from FileAsset f where f.id = :id and f.ownerId = :ownerId")
    Optional<FileAsset> findByIdAndOwnerIdForUpdate(long id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from FileAsset f where f.id = :id")
    Optional<FileAsset> findByIdForUpdate(long id);

    List<FileAsset> findAllByIdInAndOwnerId(Collection<Long> ids, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from FileAsset f where f.id in :ids and f.ownerId = :ownerId")
    List<FileAsset> findAllByIdInAndOwnerIdForUpdate(Collection<Long> ids, long ownerId);
}

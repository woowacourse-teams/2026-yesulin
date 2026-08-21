package art.yesulin.domain.photolibrary;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhotoLibraryRepository extends JpaRepository<PhotoLibrary, Long> {

    Optional<PhotoLibrary> findByOwnerId(long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select photoLibrary from PhotoLibrary photoLibrary where photoLibrary.ownerId = :ownerId")
    Optional<PhotoLibrary> findByOwnerIdForUpdate(@Param("ownerId") long ownerId);
}

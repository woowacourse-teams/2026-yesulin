package art.yesulin.domain.videolibrary;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoLibraryRepository extends JpaRepository<VideoLibrary, Long> {

    Optional<VideoLibrary> findByOwnerId(long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select library from VideoLibrary library where library.ownerId = :ownerId")
    Optional<VideoLibrary> findByOwnerIdForUpdate(@Param("ownerId") long ownerId);
}

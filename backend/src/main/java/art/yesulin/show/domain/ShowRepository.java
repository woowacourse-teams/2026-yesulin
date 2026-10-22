package art.yesulin.show.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShowRepository extends JpaRepository<Show, Long> {

    Optional<Show> findByPublicId(UUID publicId);

    Optional<Show> findByPublicIdAndOwnerId(UUID publicId, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select show from Show show where show.publicId = :publicId")
    Optional<Show> findByPublicIdForUpdate(@Param("publicId") UUID publicId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select show from Show show where show.publicId = :publicId and show.ownerId = :ownerId")
    Optional<Show> findByPublicIdAndOwnerIdForUpdate(@Param("publicId") UUID publicId, @Param("ownerId") long ownerId);

    List<Show> findAllByOwnerIdOrderByCreatedAtDescIdDesc(long ownerId);

    List<Show> findAllByStatusInAndHiddenFalseOrderByCreatedAtDescIdDesc(List<ShowStatus> statuses);
}

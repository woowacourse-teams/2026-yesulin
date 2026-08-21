package art.yesulin.domain.audition;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditionRepository extends JpaRepository<Audition, Long> {

    List<Audition> findAllByPerformanceIdAndOwnerIdOrderByCreatedAtDescIdDesc(long performanceId, long ownerId);

    Optional<Audition> findByPublicId(UUID publicId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select audition from Audition audition where audition.publicId = :publicId")
    Optional<Audition> findByPublicIdForUpdate(@Param("publicId") UUID publicId);

    Optional<Audition> findByPublicIdAndOwnerId(UUID publicId, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select audition from Audition audition
            where audition.publicId = :publicId and audition.ownerId = :ownerId
            """)
    Optional<Audition> findByPublicIdAndOwnerIdForUpdate(
            @Param("publicId") UUID publicId,
            @Param("ownerId") long ownerId
    );

    Optional<Audition> findByIdAndOwnerId(long id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select audition from Audition audition where audition.id = :id and audition.ownerId = :ownerId")
    Optional<Audition> findByIdAndOwnerIdForUpdate(@Param("id") long id, @Param("ownerId") long ownerId);
}

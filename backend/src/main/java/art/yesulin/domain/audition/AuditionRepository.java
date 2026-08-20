package art.yesulin.domain.audition;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditionRepository extends JpaRepository<Audition, Long> {

    Optional<Audition> findByIdAndOwnerId(long id, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select audition from Audition audition where audition.id = :id and audition.ownerId = :ownerId")
    Optional<Audition> findByIdAndOwnerIdForUpdate(@Param("id") long id, @Param("ownerId") long ownerId);
}

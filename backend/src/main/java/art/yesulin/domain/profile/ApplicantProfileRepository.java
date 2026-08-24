package art.yesulin.domain.profile;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicantProfileRepository extends JpaRepository<ApplicantProfile, Long> {

    Optional<ApplicantProfile> findByOwnerId(long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select profile from ApplicantProfile profile where profile.ownerId = :ownerId")
    Optional<ApplicantProfile> findByOwnerIdForUpdate(@Param("ownerId") long ownerId);
}

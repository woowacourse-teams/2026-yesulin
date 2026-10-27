package art.yesulin.actor.domain.page;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActorPageRepository extends JpaRepository<ActorPage, Long> {

    Optional<ActorPage> findByOwnerMemberId(long ownerMemberId);

    boolean existsByHandleAndOwnerMemberIdNot(String handle, long ownerMemberId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select page from ActorPage page where page.ownerMemberId = :ownerMemberId")
    Optional<ActorPage> findByOwnerMemberIdForUpdate(@Param("ownerMemberId") long ownerMemberId);
}

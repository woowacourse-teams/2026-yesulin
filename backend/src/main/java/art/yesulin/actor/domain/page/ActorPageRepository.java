package art.yesulin.actor.domain.page;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActorPageRepository extends JpaRepository<ActorPage, Long> {

    Optional<ActorPage> findByOwnerMemberId(long ownerMemberId);

    boolean existsByHandleAndOwnerMemberIdNot(String handle, long ownerMemberId);

    Optional<ActorPage> findByHandle(String handle);

    Optional<ActorPage> findByPublicId(UUID publicId);

    /** 배우 목록에 나오는 페이지. 운영자 잠금은 상태를 비공개로 바꾸지만 잠금 여부도 함께 거른다. */
    Page<ActorPage> findAllByStatusAndLockedAtIsNull(ActorPageStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select page from ActorPage page where page.ownerMemberId = :ownerMemberId")
    Optional<ActorPage> findByOwnerMemberIdForUpdate(@Param("ownerMemberId") long ownerMemberId);
}

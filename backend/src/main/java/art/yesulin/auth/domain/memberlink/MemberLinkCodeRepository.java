package art.yesulin.auth.domain.memberlink;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberLinkCodeRepository extends JpaRepository<MemberLinkCode, Long> {

    @Query("select code.memberId from MemberLinkCode code where code.codeHash = :hash")
    Optional<Long> findMemberIdByCodeHash(@Param("hash") String hash);

    boolean existsByCodeHash(String codeHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select code from MemberLinkCode code where code.memberId = :memberId")
    Optional<MemberLinkCode> findByIdForUpdate(@Param("memberId") long memberId);
}

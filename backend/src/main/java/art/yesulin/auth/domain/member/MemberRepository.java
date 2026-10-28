package art.yesulin.auth.domain.member;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface MemberRepository extends JpaRepository<Member, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Member m where m.id = :id")
    Optional<Member> findForUpdate(long id);

    Optional<Member> findByEmail(String email);

    List<Member> findAllByType(MemberType type);

    long countByType(MemberType type);

    long countByTypeAndStatus(MemberType type, MemberStatus status);
}

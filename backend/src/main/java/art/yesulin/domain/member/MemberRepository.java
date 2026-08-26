package art.yesulin.domain.member;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByEmail(String email);

    List<Member> findAllByType(MemberType type);

    long countByType(MemberType type);

    long countByTypeAndStatus(MemberType type, MemberStatus status);
}

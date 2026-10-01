package art.yesulin.domain.producer;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProducerRepository extends JpaRepository<Producer, Long> {

    Optional<Producer> findByMemberId(long memberId);

    List<Producer> findAllByMemberIdIn(Collection<Long> memberIds);
}

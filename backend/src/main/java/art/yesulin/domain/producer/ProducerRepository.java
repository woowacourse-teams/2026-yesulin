package art.yesulin.domain.producer;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProducerRepository extends JpaRepository<Producer, Long> {

    Optional<Producer> findByMemberId(long memberId);
}

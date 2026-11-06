package art.yesulin.feedback.domain;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    Slice<Feedback> findByIdLessThanOrderByIdDesc(long before, Pageable pageable);
}

package art.yesulin.infrastructure.application;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationAnswerJpaRepository
        extends JpaRepository<ApplicationAnswerJpaEntity, Long> {
}

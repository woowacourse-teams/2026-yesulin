package art.yesulin.infrastructure.persistence.emailverification;

import art.yesulin.domain.auth.EmailVerification;
import art.yesulin.domain.auth.EmailVerificationRepository;
import art.yesulin.domain.member.Member;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
public class JpaEmailVerificationRepository implements EmailVerificationRepository {

    private final EntityManager entityManager;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(EmailVerification verification, Instant now) {
        entityManager.find(Member.class, verification.memberId(), LockModeType.PESSIMISTIC_WRITE);
        entityManager.createQuery("""
                        delete from EmailVerificationEntity verification
                        where verification.expiresAt <= :now
                           or verification.memberId = :memberId
                           or verification.token = :token
                        """)
                .setParameter("now", now)
                .setParameter("memberId", verification.memberId())
                .setParameter("token", verification.token())
                .executeUpdate();
        entityManager.clear();
        entityManager.persist(EmailVerificationEntity.from(verification));
    }

    @Override
    public Optional<EmailVerification> findByToken(String token) {
        return findEntityByToken(token).map(EmailVerificationEntity::toDomain);
    }

    @Override
    @Transactional
    public Optional<EmailVerification> removeByToken(String token) {
        Optional<EmailVerificationEntity> entity = Optional.ofNullable(entityManager.find(
                EmailVerificationEntity.class,
                token,
                LockModeType.PESSIMISTIC_WRITE
        ));
        entity.ifPresent(entityManager::remove);
        return entity.map(EmailVerificationEntity::toDomain);
    }

    private Optional<EmailVerificationEntity> findEntityByToken(String token) {
        return Optional.ofNullable(entityManager.find(EmailVerificationEntity.class, token));
    }
}

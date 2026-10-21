package art.yesulin.auth.infrastructure.persistence.passwordreset;

import art.yesulin.auth.domain.PasswordReset;
import art.yesulin.auth.domain.PasswordResetRepository;
import art.yesulin.auth.domain.member.Member;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** 여러 인스턴스가 같은 토큰을 확인할 수 있도록 비밀번호 재설정 토큰을 DB에 저장한다. */
@Repository
@RequiredArgsConstructor
public class JpaPasswordResetRepository implements PasswordResetRepository {

    private final EntityManager entityManager;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(PasswordReset passwordReset, Instant now) {
        entityManager.find(Member.class, passwordReset.memberId(), LockModeType.PESSIMISTIC_WRITE);
        entityManager.createQuery("""
                        delete from PasswordResetEntity passwordReset
                        where passwordReset.expiresAt <= :now
                           or passwordReset.memberId = :memberId
                           or passwordReset.token = :token
                        """)
                .setParameter("now", now)
                .setParameter("memberId", passwordReset.memberId())
                .setParameter("token", passwordReset.token())
                .executeUpdate();
        entityManager.clear();
        entityManager.persist(PasswordResetEntity.from(passwordReset));
    }

    @Override
    public Optional<PasswordReset> findByToken(String token) {
        return Optional.ofNullable(entityManager.find(PasswordResetEntity.class, token))
                .map(PasswordResetEntity::toDomain);
    }

    @Override
    @Transactional
    public Optional<PasswordReset> removeByToken(String token) {
        Optional<PasswordResetEntity> entity = Optional.ofNullable(entityManager.find(
                PasswordResetEntity.class,
                token,
                LockModeType.PESSIMISTIC_WRITE
        ));
        entity.ifPresent(entityManager::remove);
        return entity.map(PasswordResetEntity::toDomain);
    }
}

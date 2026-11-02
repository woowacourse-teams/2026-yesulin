package art.yesulin.auth.infrastructure.persistence.emailverification;

import art.yesulin.auth.application.AuthErrorCode;
import art.yesulin.auth.domain.EmailVerification;
import art.yesulin.auth.domain.EmailVerificationRepository;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
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

    private static final String DELETE_PREVIOUS = """
            delete from EmailVerificationEntity verification
            where verification.expiresAt <= :now or verification.memberId = :memberId or verification.token = :token
            """;

    private final EntityManager entityManager;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(EmailVerification verification, Instant now) {
        Member member = entityManager.find(Member.class, verification.memberId(), LockModeType.PESSIMISTIC_WRITE);
        ensureCanIssue(member, verification, now);
        deletePrevious(verification, now);
        entityManager.clear();
        entityManager.persist(EmailVerificationEntity.from(verification));
    }

    private void deletePrevious(EmailVerification verification, Instant now) {
        entityManager.createQuery(DELETE_PREVIOUS)
                .setParameter("now", now)
                .setParameter("memberId", verification.memberId())
                .setParameter("token", verification.token())
                .executeUpdate();
    }

    private void ensureCanIssue(Member member, EmailVerification verification, Instant now) {
        if (!verification.hasCode()) {
            return;
        }
        ensurePendingProducer(member);
        ensureResendAllowed(verification.memberId(), now);
    }

    private void ensurePendingProducer(Member member) {
        if (member == null || member.getType() != MemberType.PRODUCER || member.getStatus() != MemberStatus.PENDING) {
            throw new BusinessException(AuthErrorCode.INVALID_EMAIL_VERIFICATION, "인증할 계정을 찾을 수 없습니다.");
        }
    }

    private void ensureResendAllowed(long memberId, Instant now) {
        boolean allowed = findByMemberId(memberId).map(verification -> verification.canResendAt(now)).orElse(true);
        if (!allowed) {
            throw new BusinessException(AuthErrorCode.EMAIL_VERIFICATION_RESEND_TOO_SOON,
                    "인증번호는 발급 후 60초가 지나면 다시 요청할 수 있습니다.");
        }
    }

    @Override
    public Optional<EmailVerification> findByMemberId(long memberId) {
        return entityManager.createQuery("from EmailVerificationEntity where memberId = :memberId",
                        EmailVerificationEntity.class)
                .setParameter("memberId", memberId).getResultList().stream().findFirst()
                .map(EmailVerificationEntity::toDomain);
    }

    @Override
    public Optional<Long> findMemberIdByToken(String token) {
        return entityManager.createQuery(
                        "select memberId from EmailVerificationEntity where token = :token", Long.class)
                .setParameter("token", token).getResultList().stream().findFirst();
    }

    @Override
    @Transactional
    public void recordFailure(String token) {
        EmailVerificationEntity entity = entityManager.find(EmailVerificationEntity.class, token,
                LockModeType.PESSIMISTIC_WRITE);
        entity.recordFailure();
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

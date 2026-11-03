package art.yesulin.auth.application;

import art.yesulin.auth.domain.EmailVerification;
import art.yesulin.auth.domain.EmailVerificationRepository;
import art.yesulin.auth.domain.VerificationCode;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.mail.MailSender;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final EmailVerificationRepository verificationRepository;
    private final MemberRepository memberRepository;
    private final VerificationTokenGenerator tokenGenerator;
    private final EmailVerificationMailFactory mailFactory;
    private final MailSender mailSender;
    private final Clock clock;
    private final EmailVerificationSettings settings;
    private final VerificationCodeGenerator codeGenerator;
    private final PasswordEncoder passwordEncoder;

    public void sendInitialVerification(String email) {
        try {
            sendVerification(email);
        } catch (RuntimeException exception) {
            log.atError().addKeyValue("event", "UNEXPECTED_SERVICE_ERROR")
                    .addKeyValue("exception", exception.getClass().getSimpleName())
                    .log("INITIAL_VERIFICATION_FAILED");
        }
    }

    public void sendVerification(String email) {
        Member member = memberRepository.findByEmail(email)
                .filter(this::isPendingProducer)
                .orElseThrow(() -> invalidVerification("인증할 기획사·제작사 계정을 찾을 수 없습니다."));

        issueVerification(member);
    }

    public void resendVerification(long memberId) {
        Member member = memberRepository.findById(memberId)
                .filter(this::isPendingProducer)
                .orElseThrow(() -> invalidVerification("인증할 기획사·제작사 계정을 찾을 수 없습니다."));

        issueVerification(member);
    }

    private void issueVerification(Member member) {
        Instant now = clock.instant();
        VerificationCode code = codeGenerator.generate();
        EmailVerification verification = createCodeVerification(member, code, now);
        verificationRepository.save(verification, now);
        mailSender.send(mailFactory.create(member.getEmail(), code.value(), verification.expiresAt()));
    }

    private EmailVerification createCodeVerification(Member member, VerificationCode code, Instant now) {
        return EmailVerification.forCode(tokenGenerator.generate(), member.getId(), member.getEmail(),
                passwordEncoder.encode(code.value()), now, settings.expiration());
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public MemberPrincipal verifyCode(long memberId, VerificationCode code) {
        Member member = pendingProducerForUpdate(memberId);
        EmailVerification verification = verificationFor(member);
        ensureCodeAvailable(verification);
        verifyCodeMatches(verification, code);
        verificationRepository.removeByToken(verification.token());
        member.activate();
        return MemberPrincipal.from(member);
    }

    private Member pendingProducerForUpdate(long memberId) {
        return memberRepository.findForUpdate(memberId).filter(this::isPendingProducer)
                .orElseThrow(() -> invalidVerification("인증할 계정을 찾을 수 없습니다."));
    }

    private EmailVerification verificationFor(Member member) {
        return verificationRepository.findByMemberId(member.getId())
                .filter(verification -> verification.email().equals(member.getEmail()))
                .orElseThrow(() -> invalidVerification("인증번호를 다시 요청해 주세요."));
    }

    private void ensureCodeAvailable(EmailVerification verification) {
        if (verification.isExpiredAt(clock.instant())) {
            throw expiredVerification();
        }
        if (!verification.hasCode()) {
            throw invalidVerification("새 인증번호를 요청해 주세요.");
        }
        ensureAttemptsRemain(verification);
    }

    private void ensureAttemptsRemain(EmailVerification verification) {
        if (verification.isAttemptLimitReached()) {
            throw attemptsExceeded();
        }
    }

    private void verifyCodeMatches(EmailVerification verification, VerificationCode code) {
        if (passwordEncoder.matches(code.value(), verification.codeHash())) {
            return;
        }
        verificationRepository.recordFailure(verification.token());
        ensureAttemptsRemain(verification.withFailedAttempts(verification.failedAttempts() + 1));
        throw invalidVerification("인증번호가 일치하지 않습니다. 받은 메일을 확인해 주세요.");
    }

    private boolean isPendingProducer(Member member) {
        return member.getType() == MemberType.PRODUCER && member.getStatus() == MemberStatus.PENDING;
    }

    @Transactional
    public MemberPrincipal verify(String token) {
        String validToken = requireToken(token);
        Member member = legacyVerificationMember(validToken);
        consumeLegacyVerification(validToken, member);
        member.activate();
        return MemberPrincipal.from(member);
    }

    private Member legacyVerificationMember(String token) {
        long memberId = verificationRepository.findMemberIdByToken(token)
                .orElseThrow(() -> invalidVerification("유효하지 않은 이메일 인증 링크입니다."));
        return memberRepository.findForUpdate(memberId)
                .filter(candidate -> candidate.getType() == MemberType.PRODUCER)
                .orElseThrow(() -> invalidVerification("인증할 기획사·제작사 계정을 찾을 수 없습니다."));
    }

    private void consumeLegacyVerification(String token, Member member) {
        EmailVerification verification = verificationRepository.removeByToken(token)
                .orElseThrow(() -> invalidVerification("이미 사용한 인증 링크입니다."));
        ensureLegacyVerification(verification, member);
        ensureNotExpired(verification);
    }

    private void ensureLegacyVerification(EmailVerification verification, Member member) {
        if (verification.hasCode() || !verification.email().equals(member.getEmail())) {
            throw invalidVerification("가입 화면에서 새 인증번호를 입력해 주세요.");
        }
    }

    private void ensureNotExpired(EmailVerification verification) {
        if (verification.isExpiredAt(clock.instant())) {
            throw expiredVerification();
        }
    }

    private String requireToken(String token) {
        if (token == null || token.isBlank()) {
            throw invalidVerification("이메일 인증 토큰이 필요합니다.");
        }
        return token.trim();
    }

    private BusinessException invalidVerification(String message) {
        return new BusinessException(AuthErrorCode.INVALID_EMAIL_VERIFICATION, message);
    }

    private BusinessException expiredVerification() {
        return new BusinessException(AuthErrorCode.EXPIRED_EMAIL_VERIFICATION,
                "인증 유효시간이 만료됐습니다. 새 인증번호를 요청해 주세요.");
    }

    private BusinessException attemptsExceeded() {
        return new BusinessException(AuthErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED,
                "인증번호를 5회 잘못 입력했습니다. 새 인증번호를 요청해 주세요.");
    }
}

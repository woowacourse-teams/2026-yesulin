package art.yesulin.application.auth;

import art.yesulin.application.mail.MailSender;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.auth.EmailVerification;
import art.yesulin.domain.auth.EmailVerificationRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberType;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailVerificationRepository verificationRepository;
    private final MemberRepository memberRepository;
    private final VerificationTokenGenerator tokenGenerator;
    private final EmailVerificationMailFactory mailFactory;
    private final MailSender mailSender;
    private final Clock clock;
    private final EmailVerificationSettings settings;

    public void sendVerification(String email) {
        Member member = memberRepository.findByEmail(email)
                .filter(candidate -> candidate.getType() == MemberType.PRODUCER)
                .orElseThrow(() -> invalidVerification("인증할 기획사·제작사 계정을 찾을 수 없습니다."));

        Instant now = clock.instant();
        EmailVerification verification = new EmailVerification(
                tokenGenerator.generate(), member.getId(), member.getEmail(), now.plus(settings.expiration())
        );
        verificationRepository.save(verification, now);
        mailSender.send(mailFactory.create(
                verification.email(), verification.token(), verification.expiresAt()
        ));
    }

    @Transactional
    public MemberPrincipal verify(String token) {
        EmailVerification verification = verificationRepository.removeByToken(requireToken(token))
                .orElseThrow(() -> invalidVerification("유효하지 않은 이메일 인증 링크입니다."));

        Instant now = clock.instant();
        if (verification.isExpiredAt(now)) {
            throw new BusinessException(
                    AuthErrorCode.EXPIRED_EMAIL_VERIFICATION,
                    "이메일 인증 링크가 만료됐습니다. 인증 메일을 다시 요청해 주세요."
            );
        }

        Member member = memberRepository.findById(verification.memberId())
                .filter(candidate -> verification.email().equals(candidate.getEmail()))
                .filter(candidate -> candidate.getType() == MemberType.PRODUCER)
                .orElseThrow(() -> invalidVerification("인증할 기획사·제작사 계정을 찾을 수 없습니다."));

        member.activate();
        return MemberPrincipal.from(member);
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
}

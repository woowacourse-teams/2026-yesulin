package art.yesulin.application.auth;

import art.yesulin.application.mail.MailMessage;
import art.yesulin.application.mail.MailSender;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.auth.PasswordReset;
import art.yesulin.domain.auth.PasswordResetRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberType;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetService.class);

    private final PasswordResetRepository passwordResetRepository;
    private final MemberRepository memberRepository;
    private final VerificationTokenGenerator tokenGenerator;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailFactory mailFactory;
    private final MailSender mailSender;
    private final Clock clock;
    private final PasswordResetSettings settings;

    public void sendResetMail(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        memberRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(this::canResetPassword)
                .ifPresent(this::issuePasswordReset);
    }

    private boolean canResetPassword(Member member) {
        return member.getType() == MemberType.PRODUCER && member.hasPassword();
    }

    private void issuePasswordReset(Member member) {
        Instant now = clock.instant();
        PasswordReset passwordReset = new PasswordReset(
                tokenGenerator.generate(), member.getId(), member.getEmail(), now.plus(settings.expiration())
        );
        passwordResetRepository.save(passwordReset, now);
        MailMessage message = mailFactory.create(
                passwordReset.email(), passwordReset.token(), passwordReset.expiresAt()
        );
        try {
            mailSender.send(message);
        } catch (IllegalStateException | MailException exception) {
            LOGGER.warn("비밀번호 재설정 메일 발송에 실패했습니다. type={}",
                    exception.getClass().getSimpleName());
        }
    }

    public void validateToken(String token) {
        PasswordReset passwordReset = passwordResetRepository.findByToken(requireToken(token))
                .orElseThrow(() -> invalidReset("유효하지 않은 비밀번호 재설정 링크입니다."));
        validatePasswordReset(passwordReset);
    }

    @Transactional
    public void resetPassword(String token, String password, String passwordConfirm) {
        validatePassword(password, passwordConfirm);
        PasswordReset passwordReset = passwordResetRepository.removeByToken(requireToken(token))
                .orElseThrow(() -> invalidReset("유효하지 않은 비밀번호 재설정 링크입니다."));
        Member member = validatePasswordReset(passwordReset);
        member.changePassword(passwordEncoder.encode(password));
    }

    private Member validatePasswordReset(PasswordReset passwordReset) {
        if (passwordReset.isExpiredAt(clock.instant())) {
            throw new BusinessException(
                    AuthErrorCode.EXPIRED_PASSWORD_RESET,
                    "비밀번호 재설정 링크가 만료됐습니다. "
                            + "재설정 메일을 다시 요청해 주세요."
            );
        }
        return memberRepository.findById(passwordReset.memberId())
                .filter(candidate -> passwordReset.email().equals(candidate.getEmail()))
                .filter(this::canResetPassword)
                .orElseThrow(() -> invalidReset("비밀번호를 재설정할 계정을 찾을 수 없습니다."));
    }

    private void validatePassword(String password, String passwordConfirm) {
        if (password == null || password.length() < 8 || password.length() > 64) {
            throw invalidReset("비밀번호는 8자 이상 64자 이하로 입력해 주세요.");
        }
        if (!password.equals(passwordConfirm)) {
            throw invalidReset("비밀번호가 일치하지 않습니다.");
        }
    }

    private String requireToken(String token) {
        if (token == null || token.isBlank() || token.length() > 512) {
            throw invalidReset("유효한 비밀번호 재설정 토큰이 필요합니다.");
        }
        return token.trim();
    }

    private BusinessException invalidReset(String message) {
        return new BusinessException(AuthErrorCode.INVALID_PASSWORD_RESET, message);
    }
}

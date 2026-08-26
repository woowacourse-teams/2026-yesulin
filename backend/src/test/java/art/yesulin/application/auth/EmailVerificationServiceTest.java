package art.yesulin.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.application.mail.MailMessage;
import art.yesulin.application.mail.MailSender;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.auth.EmailVerification;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberType;
import art.yesulin.infrastructure.persistence.emailverification.CollectionEmailVerificationRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class EmailVerificationServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-26T00:00:00Z");
    private static final Duration EXPIRATION = Duration.ofMinutes(30);

    private CollectionEmailVerificationRepository verificationRepository;
    private MemberRepository memberRepository;
    private VerificationTokenGenerator tokenGenerator;
    private MailSender mailSender;
    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        verificationRepository = new CollectionEmailVerificationRepository();
        memberRepository = mock(MemberRepository.class);
        tokenGenerator = mock(VerificationTokenGenerator.class);
        mailSender = mock(MailSender.class);
        EmailVerificationSettings settings = new EmailVerificationSettings(
                EXPIRATION,
                URI.create("https://api.yesulin.art/api/v1/auth/email-verifications")
        );
        service = new EmailVerificationService(
                verificationRepository,
                memberRepository,
                tokenGenerator,
                new EmailVerificationMailFactory(settings),
                mailSender,
                Clock.fixed(NOW, ZoneOffset.UTC),
                settings
        );
    }

    @Test
    void createsOneTimeVerificationAndSendsEmail() {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn(1L);
        when(member.getEmail()).thenReturn("producer@yesulin.art");
        when(member.getType()).thenReturn(MemberType.PRODUCER);
        when(memberRepository.findByEmail("producer@yesulin.art")).thenReturn(Optional.of(member));
        when(tokenGenerator.generate()).thenReturn("fixed-verification-token");

        service.sendVerification("producer@yesulin.art");

        ArgumentCaptor<MailMessage> message = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().recipient()).isEqualTo("producer@yesulin.art");
        assertThat(message.getValue().subject()).contains("이메일 인증");
        assertThat(message.getValue().htmlContent()).contains("token=fixed-verification-token");
        assertThat(verificationRepository.findByToken("fixed-verification-token")).isPresent();
    }

    @Test
    void rejectsAndDeletesExpiredVerification() {
        EmailVerification expired = new EmailVerification(
                "expired-token", 1L, "producer@yesulin.art", NOW
        );
        verificationRepository.save(expired, NOW.minusSeconds(1));

        assertThatThrownBy(() -> service.verify(expired.token()))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(AuthErrorCode.EXPIRED_EMAIL_VERIFICATION));
        assertThat(verificationRepository.findByToken(expired.token())).isEmpty();
    }
}

package art.yesulin.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import art.yesulin.application.mail.MailMessage;
import art.yesulin.application.mail.MailSender;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.auth.PasswordReset;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberType;
import art.yesulin.infrastructure.persistence.passwordreset.CollectionPasswordResetRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class PasswordResetServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-26T00:00:00Z");
    private static final String TOKEN = "fixed-password-reset-token";

    private CollectionPasswordResetRepository passwordResetRepository;
    private MemberRepository memberRepository;
    private VerificationTokenGenerator tokenGenerator;
    private PasswordEncoder passwordEncoder;
    private MailSender mailSender;
    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        passwordResetRepository = new CollectionPasswordResetRepository();
        memberRepository = mock(MemberRepository.class);
        tokenGenerator = mock(VerificationTokenGenerator.class);
        passwordEncoder = mock(PasswordEncoder.class);
        mailSender = mock(MailSender.class);
        PasswordResetSettings settings = new PasswordResetSettings(
                Duration.ofMinutes(5),
                URI.create("https://yesulin.art/forgot-password")
        );
        service = new PasswordResetService(
                passwordResetRepository,
                memberRepository,
                tokenGenerator,
                passwordEncoder,
                new PasswordResetMailFactory(settings),
                mailSender,
                Clock.fixed(NOW, ZoneOffset.UTC),
                settings
        );
    }

    @Test
    void sendsOneTimeLinkAndChangesPassword() {
        Member member = resettableProducer();
        when(memberRepository.findByEmail("producer@yesulin.art")).thenReturn(Optional.of(member));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(tokenGenerator.generate()).thenReturn(TOKEN);
        when(passwordEncoder.encode("new-password")).thenReturn("encoded-new-password");

        service.sendResetMail(" Producer@yesulin.art ");

        ArgumentCaptor<MailMessage> message = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().recipient()).isEqualTo("producer@yesulin.art");
        assertThat(message.getValue().htmlContent()).contains("token=" + TOKEN);

        service.validateToken(TOKEN);
        service.resetPassword(TOKEN, "new-password", "new-password");

        verify(member).changePassword("encoded-new-password");
        assertThat(passwordResetRepository.findByToken(TOKEN)).isEmpty();
    }

    @Test
    void doesNotRevealUnknownEmail() {
        when(memberRepository.findByEmail("unknown@yesulin.art")).thenReturn(Optional.empty());

        service.sendResetMail("unknown@yesulin.art");

        verifyNoInteractions(tokenGenerator, mailSender);
    }

    @Test
    void rejectsAndDeletesExpiredReset() {
        PasswordReset expired = new PasswordReset(TOKEN, 1L, "producer@yesulin.art", NOW);
        passwordResetRepository.save(expired, NOW.minusSeconds(1));

        assertThatThrownBy(() -> service.resetPassword(TOKEN, "new-password", "new-password"))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(AuthErrorCode.EXPIRED_PASSWORD_RESET));
        assertThat(passwordResetRepository.findByToken(TOKEN)).isEmpty();
    }

    private Member resettableProducer() {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn(1L);
        when(member.getEmail()).thenReturn("producer@yesulin.art");
        when(member.getType()).thenReturn(MemberType.PRODUCER);
        when(member.hasPassword()).thenReturn(true);
        return member;
    }
}

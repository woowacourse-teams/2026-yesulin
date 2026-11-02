package art.yesulin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.auth.domain.EmailVerification;
import art.yesulin.auth.domain.VerificationCode;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.mail.MailMessage;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class EmailVerificationCodeServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-02T00:00:00Z");
    private final FakeEmailVerificationRepository repository = new FakeEmailVerificationRepository();
    private final Member member = new Member("producer@example.com", "password", MemberType.PRODUCER,
            MemberStatus.PENDING);
    private final MemberRepository members = mock(MemberRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final Clock clock = mock(Clock.class);
    private MailMessage mail;
    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(member, "id", 1L);
        when(members.findById(1L)).thenReturn(Optional.of(member));
        when(members.findForUpdate(1L)).thenReturn(Optional.of(member));
        when(members.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(clock.instant()).thenReturn(NOW);
        when(encoder.encode(anyString())).thenReturn("hashed-code");
        when(encoder.matches(anyString(), anyString())).thenAnswer(invocation ->
                "000123".equals(invocation.getArgument(0)) && "hashed-code".equals(invocation.getArgument(1)));
        service = createService();
    }

    @Test
    void sendsSixDigitsWithoutRedirectAndStoresOnlyHash() {
        // given, when
        service.sendVerification(member.getEmail());
        // then
        assertThat(mail.textContent()).contains("000123").doesNotContain("http", "redirectUri", "token=");
        assertThat(mail.htmlContent()).contains("000123").doesNotContain("href=");
        assertThat(repository.findByMemberId(1L).orElseThrow().codeHash()).isEqualTo("hashed-code");
    }

    @Test
    void activatesOnlyTheLoggedInMemberAndConsumesCode() {
        // given
        service.sendVerification(member.getEmail());
        // when
        MemberPrincipal principal = service.verifyCode(1L, new VerificationCode("000123"));
        // then
        assertThat(principal.status()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(repository.findByMemberId(1L)).isEmpty();
    }

    @Test
    void wrongCodeKeepsAccountPendingAndPersistsFailure() {
        // given
        service.sendVerification(member.getEmail());
        // when, then
        assertError(AuthErrorCode.INVALID_EMAIL_VERIFICATION, "999999");
        assertThat(member.getStatus()).isEqualTo(MemberStatus.PENDING);
        assertThat(repository.findByMemberId(1L).orElseThrow().failedAttempts()).isEqualTo(1);
    }

    @Test
    void fifthFailureBlocksEvenTheCorrectCode() {
        // given
        service.sendVerification(member.getEmail());
        repository.setFailedAttempts(1L, 4);
        // when, then
        assertError(AuthErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED, "999999");
        assertError(AuthErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED, "000123");
        assertThat(member.getStatus()).isEqualTo(MemberStatus.PENDING);
    }

    @Test
    void rejectsExpiredCodeAtExactDeadline() {
        // given
        service.sendVerification(member.getEmail());
        when(clock.instant()).thenReturn(NOW.plusSeconds(300));
        // when, then
        assertError(AuthErrorCode.EXPIRED_EMAIL_VERIFICATION, "000123");
    }

    @Test
    void cannotUseSomeoneElsesCode() {
        // given
        service.sendVerification(member.getEmail());
        // when, then
        assertThatThrownBy(() -> service.verifyCode(2L, new VerificationCode("000123")))
                .isInstanceOf(BusinessException.class);
        assertThat(member.getStatus()).isEqualTo(MemberStatus.PENDING);
    }

    private void assertError(AuthErrorCode errorCode, String code) {
        assertThatThrownBy(() -> service.verifyCode(1L, new VerificationCode(code)))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }

    private EmailVerificationService createService() {
        EmailVerificationSettings settings = new EmailVerificationSettings(Duration.ofMinutes(5),
                URI.create("https://api.example.com/verify"), URI.create("https://example.com/producers"));
        return new EmailVerificationService(repository, members, () -> "random-token",
                new EmailVerificationMailFactory(),
                message -> mail = message, clock, settings, () -> new VerificationCode("000123"), encoder);
    }
}

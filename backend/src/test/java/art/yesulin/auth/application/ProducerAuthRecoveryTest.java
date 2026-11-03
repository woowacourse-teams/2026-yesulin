package art.yesulin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import art.yesulin.auth.domain.EmailVerification;
import art.yesulin.auth.domain.EmailVerificationRepository;
import art.yesulin.auth.domain.VerificationCode;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.mail.MailSender;
import art.yesulin.producer.application.ProducerResult;
import art.yesulin.producer.application.ProducerSignUpService;
import art.yesulin.producer.application.SignUpProducerCommand;
import art.yesulin.producer.domain.ProducerRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mail.MailSendException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:producer-auth-recovery;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class ProducerAuthRecoveryTest {

    private static final String EMAIL = "recovery@yesulin.art";
    private static final String PASSWORD = "password1234";
    private static final Instant NOW = Instant.parse("2026-11-02T00:00:00Z");

    @Autowired
    private ProducerSignUpService signUpService;
    @Autowired
    private AuthService authService;
    @Autowired
    private EmailVerificationService verificationService;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private ProducerRepository producerRepository;
    @MockitoBean
    private MailSender mailSender;
    @Autowired
    private EmailVerificationRepository verifications;
    @MockitoBean
    private Clock clock;
    @MockitoBean
    private VerificationCodeGenerator codeGenerator;

    @BeforeEach
    void cleanUp() {
        producerRepository.deleteAll();
        memberRepository.deleteAll();
        when(clock.instant()).thenReturn(NOW);
        when(codeGenerator.generate()).thenReturn(new VerificationCode("000123"));
    }

    @Test
    void smtpFailureKeepsSuccessfulSignupAndAllowsLoginAndResend() {
        doThrow(new MailSendException("smtp unavailable")).when(mailSender).send(any());
        ProducerResult result = signUpService.signUp(command());
        assertThat(result.verificationStatus()).isEqualTo(MemberStatus.PENDING);
        assertThat(authService.login(EMAIL, PASSWORD).status()).isEqualTo(MemberStatus.PENDING);
        assertResendFailureAndRecovery(result.memberId());
    }

    private void assertResendFailureAndRecovery(long memberId) {
        when(clock.instant()).thenReturn(NOW.plusSeconds(61));
        assertThatThrownBy(() -> verificationService.resendVerification(memberId))
                .isInstanceOf(MailSendException.class);
        doNothing().when(mailSender).send(any());
        when(clock.instant()).thenReturn(NOW.plusSeconds(122));
        verificationService.resendVerification(memberId);
        assertThat(authService.findCurrent(memberId).status()).isEqualTo(MemberStatus.PENDING);
    }

    @Test
    void readsActivationPerformedOutsideExistingSession() {
        ProducerResult result = signUpService.signUp(command());
        MemberPrincipal oldSession = authService.login(EMAIL, PASSWORD);
        Member member = memberRepository.findById(result.memberId()).orElseThrow();
        member.activate();
        memberRepository.save(member);

        assertThat(oldSession.status()).isEqualTo(MemberStatus.PENDING);
        assertThat(authService.findCurrent(oldSession.memberId()).status()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    void rejectsSessionWhoseMemberWasDeleted() {
        ProducerResult result = signUpService.signUp(command());
        producerRepository.deleteAll();
        memberRepository.deleteById(result.memberId());

        assertThatThrownBy(() -> authService.findCurrent(result.memberId()))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(AuthErrorCode.UNAUTHENTICATED));
    }

    private SignUpProducerCommand command() {
        return new SignUpProducerCommand("복구 극단", "01012345678", EMAIL, PASSWORD);
    }

    @Test
    void persistsWrongCodeAttemptsAcrossTransactions() {
        // given
        ProducerResult result = signUpService.signUp(command());
        // when
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> verificationService.verifyCode(result.memberId(), new VerificationCode("999999")))
                    .isInstanceOf(BusinessException.class);
        }
        // then
        assertThat(verifications.findByMemberId(result.memberId()).orElseThrow().failedAttempts()).isEqualTo(5);
        assertThatThrownBy(() -> verificationService.verifyCode(result.memberId(), new VerificationCode("000123")))
                .isInstanceOfSatisfying(BusinessException.class, exception -> assertThat(exception.getErrorCode())
                        .isEqualTo(AuthErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED));
    }

    @Test
    void enforcesResendDelayAndInvalidatesPreviousCode() {
        // given
        ProducerResult result = signUpService.signUp(command());
        assertThatThrownBy(() -> verificationService.resendVerification(result.memberId()))
                .isInstanceOfSatisfying(BusinessException.class, exception -> assertThat(exception.getErrorCode())
                        .isEqualTo(AuthErrorCode.EMAIL_VERIFICATION_RESEND_TOO_SOON));
        // when
        when(clock.instant()).thenReturn(NOW.plusSeconds(61));
        when(codeGenerator.generate()).thenReturn(new VerificationCode("456789"));
        verificationService.resendVerification(result.memberId());
        // then
        assertThatThrownBy(() -> verificationService.verifyCode(result.memberId(), new VerificationCode("000123")))
                .isInstanceOf(BusinessException.class);
        MemberPrincipal principal = verificationService.verifyCode(result.memberId(), new VerificationCode("456789"));
        assertThat(principal.status()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(verifications.findByMemberId(result.memberId())).isEmpty();
    }

    @Test
    void consumesConcurrentLegacyRequestsOnceWithoutUnexpectedFailure() throws Exception {
        // given
        ProducerResult result = signUpService.signUp(command());
        verifications.save(new EmailVerification("legacy-token", result.memberId(), EMAIL, NOW.plusSeconds(300)), NOW);
        // when
        List<String> outcomes = race(() -> verificationService.verify("legacy-token"),
                () -> verificationService.verify("legacy-token"));
        // then
        assertThat(outcomes).containsExactlyInAnyOrder("SUCCESS", "AUTH_INVALID_EMAIL_VERIFICATION");
    }

    @Test
    void serializesLegacyVerificationAndResendWithoutUnexpectedFailure() throws Exception {
        // given
        ProducerResult result = signUpService.signUp(command());
        verifications.save(new EmailVerification("legacy-token", result.memberId(), EMAIL, NOW.plusSeconds(300)), NOW);
        // when
        List<String> outcomes = race(() -> verificationService.verify("legacy-token"),
                () -> verificationService.resendVerification(result.memberId()));
        // then
        assertThat(outcomes).containsExactlyInAnyOrder("SUCCESS", "AUTH_INVALID_EMAIL_VERIFICATION");
    }

    @Test
    void serializesCodeVerificationAndResendWithoutUnexpectedFailure() throws Exception {
        // given
        ProducerResult result = signUpService.signUp(command());
        when(clock.instant()).thenReturn(NOW.plusSeconds(61));
        when(codeGenerator.generate()).thenReturn(new VerificationCode("456789"));
        // when
        List<String> outcomes = race(
                () -> verificationService.verifyCode(result.memberId(), new VerificationCode("000123")),
                () -> verificationService.resendVerification(result.memberId()));
        // then
        assertThat(outcomes).containsExactlyInAnyOrder("SUCCESS", "AUTH_INVALID_EMAIL_VERIFICATION");
    }

    private List<String> race(Runnable first, Runnable second) throws Exception {
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);
            Future<String> firstResult = executor.submit(afterStart(first, ready, start));
            Future<String> secondResult = executor.submit(afterStart(second, ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(firstResult.get(10, TimeUnit.SECONDS), secondResult.get(10, TimeUnit.SECONDS));
        }
    }

    private Callable<String> afterStart(Runnable action, CountDownLatch ready, CountDownLatch start) {
        return () -> {
            ready.countDown();
            start.await();
            return resultOf(action);
        };
    }

    private String resultOf(Runnable action) {
        try {
            action.run();
            return "SUCCESS";
        } catch (BusinessException exception) {
            return exception.getErrorCode().code();
        }
    }
}

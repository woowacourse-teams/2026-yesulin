package art.yesulin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;

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

    @BeforeEach
    void cleanUp() {
        producerRepository.deleteAll();
        memberRepository.deleteAll();
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
        assertThatThrownBy(() -> verificationService.resendVerification(memberId))
                .isInstanceOf(MailSendException.class);
        doNothing().when(mailSender).send(any());
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
}

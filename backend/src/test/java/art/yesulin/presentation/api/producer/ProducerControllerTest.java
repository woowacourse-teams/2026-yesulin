package art.yesulin.presentation.api.producer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.VerificationTokenGenerator;
import art.yesulin.application.mail.MailMessage;
import art.yesulin.application.mail.MailSender;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:producer-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, ProducerControllerTest.MailTestConfiguration.class})
@AutoConfigureMockMvc
class ProducerControllerTest {

    private static final String VERIFICATION_TOKEN = "fixed-verification-token";
    private static final String REDIRECT_URI = "http://localhost:3000/producers";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @Autowired
    private FakeMailSender mailSender;

    @BeforeEach
    void cleanUp() {
        producerRepository.deleteAll();
        memberRepository.deleteAll();
        mailSender.clear();
    }

    @Test
    void signsUpProducerAsPendingAndSendsVerificationEmail() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyName").value("예술인 컴퍼니"))
                .andExpect(jsonPath("$.role").value("PRODUCER"))
                .andExpect(jsonPath("$.verificationStatus").value("PENDING"));

        assertThat(mailSender.message.recipient()).isEqualTo("producer@yesulin.art");
        assertThat(mailSender.message.subject()).contains("이메일 인증");
        assertThat(mailSender.message.htmlContent()).contains("token=" + VERIFICATION_TOKEN);
        assertThat(mailSender.message.textContent())
                .contains("redirectUri=")
                .contains("localhost:3000");
    }

    @Test
    void verifiesProducerEmailWithOneTimeToken() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/auth/email-verifications")
                        .param("token", VERIFICATION_TOKEN)
                        .param("redirectUri", REDIRECT_URI))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl(REDIRECT_URI));

        assertThat(memberRepository.findByEmail("producer@yesulin.art"))
                .get()
                .satisfies(member -> assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE));

        mockMvc.perform(get("/api/v1/auth/email-verifications")
                        .param("token", VERIFICATION_TOKEN)
                        .param("redirectUri", REDIRECT_URI))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUTH_INVALID_EMAIL_VERIFICATION"));
    }

    @Test
    void redirectsToRequestedUriAfterVerification() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated());

        String requestedRedirectUri = "https://yesulin.art/producers";
        mockMvc.perform(get("/api/v1/auth/email-verifications")
                        .param("token", VERIFICATION_TOKEN)
                        .param("redirectUri", requestedRedirectUri))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl(requestedRedirectUri));
    }

    @Test
    void resendsVerificationEmailForPendingProducer() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated());

        var member = memberRepository.findByEmail("producer@yesulin.art").orElseThrow();
        mailSender.clear();

        mockMvc.perform(post("/api/v1/auth/email-verifications")
                        .with(csrf())
                        .sessionAttr(
                                MemberPrincipal.SESSION_ATTRIBUTE,
                                new MemberPrincipal(member.getId(), member.getType(), member.getStatus())
                        ))
                .andExpect(status().isNoContent());

        assertThat(mailSender.message.recipient()).isEqualTo("producer@yesulin.art");
        assertThat(mailSender.message.htmlContent()).contains("token=" + VERIFICATION_TOKEN);
    }

    @Test
    void rejectsDuplicateEmail() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PRODUCER_DUPLICATE_EMAIL"));
    }

    @Test
    void rejectsMismatchedPasswordConfirm() throws Exception {
        String request = """
                {
                  "companyName": "예술인 컴퍼니",
                  "phone": "01012345678",
                  "email": "producer@yesulin.art",
                  "password": "password1234",
                  "passwordConfirm": "different1234",
                  "termsAgreed": true
                }
                """;

        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsWhenTermsNotAgreed() throws Exception {
        String request = """
                {
                  "companyName": "예술인 컴퍼니",
                  "phone": "01012345678",
                  "email": "producer@yesulin.art",
                  "password": "password1234",
                  "passwordConfirm": "password1234",
                  "termsAgreed": false
                }
                """;

        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest());
    }

    private String signUpRequest(String email) {
        return """
                {
                  "companyName": "예술인 컴퍼니",
                  "phone": "01012345678",
                  "email": "%s",
                  "password": "password1234",
                  "passwordConfirm": "password1234",
                  "termsAgreed": true
                }
                """.formatted(email);
    }

    @TestConfiguration
    static class MailTestConfiguration {

        @Bean
        @Primary
        FakeMailSender fakeMailSender() {
            return new FakeMailSender();
        }

        @Bean
        @Primary
        VerificationTokenGenerator fixedVerificationTokenGenerator() {
            return () -> VERIFICATION_TOKEN;
        }
    }

    static class FakeMailSender implements MailSender {

        private MailMessage message;

        @Override
        public void send(MailMessage message) {
            this.message = message;
        }

        void clear() {
            message = null;
        }
    }
}

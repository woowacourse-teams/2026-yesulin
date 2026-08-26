package art.yesulin.presentation.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.application.auth.VerificationTokenGenerator;
import art.yesulin.application.mail.MailMessage;
import art.yesulin.application.mail.MailSender;
import art.yesulin.domain.auth.PasswordResetRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
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
        "spring.datasource.url=jdbc:h2:mem:password-reset-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "yesulin.mail.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, PasswordResetControllerTest.PasswordResetTestConfiguration.class})
@AutoConfigureMockMvc
class PasswordResetControllerTest {

    private static final String EMAIL = "producer@yesulin.art";
    private static final String TOKEN = "fixed-password-reset-token";
    private static final String OLD_PASSWORD = "old-password";
    private static final String NEW_PASSWORD = "new-password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordResetRepository passwordResetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private FakeMailSender mailSender;

    @BeforeEach
    void setUp() {
        passwordResetRepository.removeByToken(TOKEN);
        memberRepository.deleteAll();
        memberRepository.save(new Member(
                EMAIL,
                passwordEncoder.encode(OLD_PASSWORD),
                MemberType.PRODUCER,
                MemberStatus.ACTIVE
        ));
        mailSender.clear();
    }

    @Test
    void sendsMailValidatesTokenAndChangesPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password-resets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"producer@yesulin.art"}
                                """))
                .andExpect(status().isNoContent());

        assertThat(mailSender.message.recipient()).isEqualTo(EMAIL);
        assertThat(mailSender.message.htmlContent()).contains("token=" + TOKEN);

        mockMvc.perform(get("/api/v1/auth/password-resets").param("token", TOKEN))
                .andExpect(status().isNoContent());

        mockMvc.perform(patch("/api/v1/auth/password-resets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token":"fixed-password-reset-token",
                                  "password":"new-password",
                                  "passwordConfirm":"new-password"
                                }
                                """))
                .andExpect(status().isNoContent());

        Member changed = memberRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(passwordEncoder.matches(NEW_PASSWORD, changed.getPassword())).isTrue();

        mockMvc.perform(get("/api/v1/auth/password-resets").param("token", TOKEN))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUTH_INVALID_PASSWORD_RESET"));
    }

    @Test
    void doesNotRevealUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password-resets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"unknown@yesulin.art"}
                                """))
                .andExpect(status().isNoContent());

        assertThat(mailSender.message).isNull();
    }

    @TestConfiguration
    static class PasswordResetTestConfiguration {

        @Bean
        @Primary
        FakeMailSender fakeMailSender() {
            return new FakeMailSender();
        }

        @Bean
        @Primary
        VerificationTokenGenerator fixedVerificationTokenGenerator() {
            return () -> TOKEN;
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

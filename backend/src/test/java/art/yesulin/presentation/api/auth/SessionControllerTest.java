package art.yesulin.presentation.api.auth;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:session-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class SessionControllerTest {

    private static final String EMAIL = "producer@yesulin.art";
    private static final String PASSWORD = "password1234";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        memberRepository.deleteAll();
        memberRepository.save(new Member(EMAIL, passwordEncoder.encode(PASSWORD), MemberType.PRODUCER,
                MemberStatus.ACTIVE));
    }

    @Test
    void createSessionOnLogin() throws Exception {
        String request = """
                {"email": "%s", "password":"%s"}
                """.formatted(EMAIL, PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/v1/sessions")
                        .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PRODUCER"))
                .andReturn();

        HttpSession session = result.getRequest().getSession(false);
        assertNotNull(session);
        assertNotNull(
                session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE));
    }

    @Test
    void rejectMalformedEmail() throws Exception {
        String request = """
                {"email": "not-an-email", "password": "%s"}
                """.formatted(PASSWORD);

        mockMvc.perform(post("/api/v1/sessions")
                        .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
                .andExpect(status().isBadRequest());
    }

    @Test
    void findsCurrentSession() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/sessions/current")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberId").value(1))
                .andExpect(jsonPath("$.role").value("PRODUCER"));
    }

    @Test
    void rejectsCurrentSessionWhenNotLoggedIn() throws Exception {
        mockMvc.perform(get("/api/v1/sessions/current"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void removesSessionOnLogout() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        MvcResult result = mockMvc.perform(delete("/api/v1/sessions/current")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal))
                .andExpect(status().isNoContent())
                .andReturn();

        assertNull(result.getRequest().getSession(false));
    }

    @Test
    void allowsLogoutWithoutSession() throws Exception {
        mockMvc.perform(delete("/api/v1/sessions/current")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void changesSessionIdOnLogin() throws Exception {
        MockHttpSession existingSession = new MockHttpSession();
        String sessionIdBeforeLogin = existingSession.getId();

        String request = """
                {"email": "%s", "password":"%s"}
                """.formatted(EMAIL, PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/v1/sessions")
                        .with(csrf())
                        .session(existingSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andReturn();

        HttpSession sessionAfterLogin = result.getRequest().getSession(false);
        assertNotNull(sessionAfterLogin);
        assertNotEquals(sessionIdBeforeLogin, sessionAfterLogin.getId());
    }
}

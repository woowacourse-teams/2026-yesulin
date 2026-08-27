package art.yesulin.presentation.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=",
        "spring.datasource.url=jdbc:h2:mem:jdbc-session;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "server.servlet.session.cookie.secure=true"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class JdbcSessionPersistenceTest {

    private static final String EMAIL = "persistent-session@yesulin.art";
    private static final String PASSWORD = "password1234";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from SPRING_SESSION_ATTRIBUTES");
        jdbcTemplate.update("delete from SPRING_SESSION");
        memberRepository.deleteAll();
        memberRepository.save(new Member(EMAIL, passwordEncoder.encode(PASSWORD), MemberType.PRODUCER,
                MemberStatus.ACTIVE));
    }

    @Test
    void persistsSessionAndAcceptsCsrfProtectedRequests() throws Exception {
        MvcResult csrfResult = mockMvc.perform(get("/api/v1/sessions/current"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        Cookie csrfCookie = csrfResult.getResponse().getCookie("XSRF-TOKEN");
        assertNotNull(csrfCookie);

        MvcResult loginResult = mockMvc.perform(post("/api/v1/sessions")
                        .cookie(csrfCookie)
                        .header("X-CSRF-Token", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("Secure"),
                        org.hamcrest.Matchers.containsString("HttpOnly"),
                        org.hamcrest.Matchers.containsString("SameSite=Lax")
                )))
                .andReturn();

        Cookie sessionCookie = loginResult.getResponse().getCookie("SESSION");
        assertNotNull(sessionCookie);
        assertEquals(1, jdbcTemplate.queryForObject("select count(*) from SPRING_SESSION", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from SPRING_SESSION_ATTRIBUTES where ATTRIBUTE_NAME = ?",
                Integer.class,
                MemberPrincipal.SESSION_ATTRIBUTE
        ));

        mockMvc.perform(get("/api/v1/sessions/current").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PRODUCER"));
    }

    private String loginRequest() {
        return """
                {"email": "%s", "password":"%s"}
                """.formatted(EMAIL, PASSWORD);
    }
}

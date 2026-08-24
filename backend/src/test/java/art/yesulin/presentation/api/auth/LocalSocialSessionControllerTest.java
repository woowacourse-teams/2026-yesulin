package art.yesulin.presentation.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.social.SocialAccountRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:local-social-session;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "yesulin.local-social-login.enabled=true"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class LocalSocialSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private SocialAccountRepository socialAccountRepository;

    @BeforeEach
    void setUp() {
        socialAccountRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void createsApplicantSessionForLocalSocialLogin() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/local/social-sessions/kakao").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("APPLICANT"))
                .andReturn();

        HttpSession session = result.getRequest().getSession(false);
        assertNotNull(session);
        MemberPrincipal principal = (MemberPrincipal) session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);
        assertNotNull(principal);
        assertEquals(MemberType.APPLICANT, principal.role());
    }

    @Test
    void redirectsLocalOauthAuthorizationToCompletionPage() throws Exception {
        mockMvc.perform(get("/oauth2/authorization/kakao"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", "/social-login/complete"));
    }

    @Test
    void reusesLocalApplicantForSameProvider() throws Exception {
        mockMvc.perform(post("/api/v1/local/social-sessions/kakao").with(csrf()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/local/social-sessions/kakao").with(csrf()))
                .andExpect(status().isOk());

        assertEquals(1, memberRepository.count());
        assertEquals(1, socialAccountRepository.count());
    }

    @Test
    void rejectsUnsupportedProvider() throws Exception {
        mockMvc.perform(post("/api/v1/local/social-sessions/unknown").with(csrf()))
                .andExpect(status().isBadRequest());
    }
}

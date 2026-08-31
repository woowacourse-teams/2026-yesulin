package art.yesulin.presentation.api.admin;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-submission-security;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "yesulin.admin.deletion-password-hash="
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminSubmissionSecurityTest {

    private static final String SUBMISSION_PATH = "/api/v1/admin/submissions/22222222-2222-4222-8222-222222222222";
    private static final String LIST_PATH = "/api/v1/admin/auditions/11111111-1111-4111-8111-111111111111/submissions";
    private static final String PASSWORD_BODY = "{\"confirmationPassword\":\"test-private-password\"}";
    private static final MemberPrincipal ADMIN = new MemberPrincipal(99L, MemberType.ADMIN, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {SUBMISSION_PATH, LIST_PATH})
    void readRejectsAnonymousRequests(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @ParameterizedTest
    @CsvSource({
            SUBMISSION_PATH + ",APPLICANT", SUBMISSION_PATH + ",PRODUCER",
            LIST_PATH + ",APPLICANT", LIST_PATH + ",PRODUCER"
    })
    void readRejectsNonAdminSessions(String path, MemberType role) throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, role, MemberStatus.ACTIVE);

        mockMvc.perform(get(path).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void deleteRejectsAnonymousRequestsWithValidCsrf() throws Exception {
        mockMvc.perform(delete(SUBMISSION_PATH).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @ParameterizedTest
    @EnumSource(value = MemberType.class, names = {"APPLICANT", "PRODUCER"})
    void deleteRejectsNonAdminSessionsWithValidCsrf(MemberType role) throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, role, MemberStatus.ACTIVE);

        mockMvc.perform(delete(SUBMISSION_PATH).with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void deleteRejectsAdminWithoutCsrf() throws Exception {
        mockMvc.perform(delete(SUBMISSION_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteRejectsAdminWithInvalidCsrf() throws Exception {
        mockMvc.perform(delete(SUBMISSION_PATH).with(csrf().useInvalidToken())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteRejectsAdminWhenPasswordHashIsNotConfigured() throws Exception {
        mockMvc.perform(delete(SUBMISSION_PATH).with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_DELETION_CONFIRMATION_FAILED"));
    }
}

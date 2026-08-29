package art.yesulin.presentation.api.diagnostic;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:upload-diagnostic;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@Import(ObjectStorageTestConfiguration.class)
class UploadDiagnosticControllerTest {

    private static final String INCIDENT_ID = "11111111-1111-4111-8111-111111111111";
    private static final MemberPrincipal APPLICANT = new MemberPrincipal(
            1L, MemberType.APPLICANT, MemberStatus.ACTIVE
    );

    @Autowired
    private MockMvc mockMvc;

    @Test
    void recordsAllowlistedFailureForAuthenticatedMember() throws Exception {
        mockMvc.perform(post("/api/v1/upload-diagnostics")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .header("X-Request-Id", INCIDENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isNoContent())
                .andExpect(header().string("X-Request-Id", INCIDENT_ID));
    }

    @Test
    void rejectsUnauthenticatedDiagnostic() throws Exception {
        mockMvc.perform(post("/api/v1/upload-diagnostics")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAttemptOutsideAllowlist() throws Exception {
        mockMvc.perform(post("/api/v1/upload-diagnostics")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .header("X-Request-Id", INCIDENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest().replace("\"attempt\": 1", "\"attempt\": 3")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsNonUuidIncidentId() throws Exception {
        mockMvc.perform(post("/api/v1/upload-diagnostics")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .header("X-Request-Id", "not-a-uuid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ignoresPrivacySensitiveExtraFieldsInsteadOfCollectingThem() throws Exception {
        String request = validRequest().replace(
                "\"coarseBrowser\": \"KAKAO\"",
                "\"coarseBrowser\": \"KAKAO\", \"originalFilename\": \"private.jpg\""
        );

        mockMvc.perform(post("/api/v1/upload-diagnostics")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .header("X-Request-Id", INCIDENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isNoContent());
    }

    private String validRequest() {
        return """
                {
                  "uploadFlow": "PROFILE_PHOTO",
                  "stage": "PUT",
                  "attempt": 1,
                  "result": "FAILED",
                  "errorCode": "WEBKIT_FILE_NOT_FOUND",
                  "serviceWorkerControlled": true,
                  "coarsePlatform": "IOS",
                  "coarseBrowser": "KAKAO"
                }
                """;
    }
}

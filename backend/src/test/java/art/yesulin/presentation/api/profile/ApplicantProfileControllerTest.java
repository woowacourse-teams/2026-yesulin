package art.yesulin.presentation.api.profile;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:applicant-profile-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class ApplicantProfileControllerTest {

    private static final String PROFILE_PATH = "/api/v1/applicants/me/profile";
    private static final MemberPrincipal APPLICANT = new MemberPrincipal(
            1L, MemberType.APPLICANT, MemberStatus.ACTIVE
    );

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsEmptyProfileBeforeFirstSave() throws Exception {
        mockMvc.perform(get(PROFILE_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basicInformation.name").doesNotExist())
                .andExpect(jsonPath("$.additionalInformation.links").isEmpty())
                .andExpect(jsonPath("$.additionalInformation.careers").isEmpty())
                .andExpect(jsonPath("$.completeness.filled").value(0))
                .andExpect(jsonPath("$.completeness.total").value(8));
    }

    @Test
    void savesPartiallyFilledBasicInformation() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(basicInformationRequest("김하린")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basicInformation.name").value("김하린"))
                .andExpect(jsonPath("$.basicInformation.phone").value("010-1234-5678"))
                .andExpect(jsonPath("$.completeness.filled").value(2))
                .andExpect(jsonPath("$.completeness.total").value(8));
    }

    @Test
    void replacesOnlyProvidedSection() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(additionalInformationRequest()))
                .andExpect(status().isOk());

        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(basicInformationRequest("새 이름")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basicInformation.name").value("새 이름"))
                .andExpect(jsonPath("$.additionalInformation.school").value("한국예술종합학교"))
                .andExpect(jsonPath("$.additionalInformation.links[0]").value("https://example.com/actor"))
                .andExpect(jsonPath("$.additionalInformation.careers[0].roleName").value("오필리어"));
    }

    @Test
    void rejectsRequestWithoutProfileSection() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_INVALID"));
    }

    @Test
    void rejectsInvalidProfileInput() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "basicInformation": {
                                    "name": null,
                                    "height": -1,
                                    "weight": null,
                                    "birthDate": null,
                                    "gender": null,
                                    "phone": "1234",
                                    "email": "invalid-email",
                                    "address": null
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void separatesProfilesByAuthenticatedMember() throws Exception {
        MemberPrincipal anotherApplicant = new MemberPrincipal(2L, MemberType.APPLICANT, MemberStatus.ACTIVE);
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(basicInformationRequest("김하린")))
                .andExpect(status().isOk());

        mockMvc.perform(get(PROFILE_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, anotherApplicant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basicInformation.name").doesNotExist())
                .andExpect(jsonPath("$.completeness.filled").value(0));
    }

    @Test
    void rejectsAnonymousAndProducer() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(get(PROFILE_PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));

        mockMvc.perform(get(PROFILE_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    private String basicInformationRequest(String name) {
        return """
                {
                  "basicInformation": {
                    "name": "%s",
                    "height": null,
                    "weight": null,
                    "birthDate": null,
                    "gender": null,
                    "phone": "010-1234-5678",
                    "email": null,
                    "address": null
                  }
                }
                """.formatted(name);
    }

    private String additionalInformationRequest() {
        return """
                {
                  "additionalInformation": {
                    "school": "한국예술종합학교",
                    "links": ["https://example.com/actor"],
                    "nationality": "대한민국",
                    "coverLetter": null,
                    "specialty": null,
                    "hobbies": null,
                    "militaryServiceStatus": "NOT_APPLICABLE",
                    "careers": [
                      {"year": 2025, "title": "햄릿", "roleName": "오필리어"}
                    ]
                  }
                }
                """;
    }
}

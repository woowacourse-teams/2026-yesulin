package art.yesulin.presentation.api.otraudition;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:otr-audition-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class OtrAuditionControllerTest {

    private static final MemberPrincipal OWNER = new MemberPrincipal(1L, MemberType.PRODUCER, MemberStatus.ACTIVE);
    private static final MemberPrincipal OTHER = new MemberPrincipal(2L, MemberType.PRODUCER, MemberStatus.ACTIVE);
    private static final String REQUEST = """
            {
              "otrId": "20146",
              "title": "햄릿 배우 모집",
              "roles": ["햄릿", "오필리어"],
              "deadline": "2026-10-15"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OtrAuditionRepository repository;

    @BeforeEach
    void cleanUp() {
        repository.deleteAll();
    }

    @Test
    void createsAndListsOnlyOwnedOtrAuditions() throws Exception {
        mockMvc.perform(post("/api/v1/otr-auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.otrId").value("20146"))
                .andExpect(jsonPath("$.otrLink").value("https://otr.co.kr/audition/?vid=20146"))
                .andExpect(jsonPath("$.roles[1]").value("오필리어"))
                .andExpect(jsonPath("$.deadline").value("2026-10-15"));

        mockMvc.perform(get("/api/v1/otr-auditions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditions.length()").value(1))
                .andExpect(jsonPath("$.auditions[0].title").value("햄릿 배우 모집"));

        mockMvc.perform(get("/api/v1/otr-auditions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OTHER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditions.length()").value(0));
    }

    @Test
    void rejectsDuplicateOtrIdForSameProducer() throws Exception {
        createAsOwner();

        mockMvc.perform(post("/api/v1/otr-auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OTR_AUDITION_DUPLICATE_OTR_ID"));

        mockMvc.perform(post("/api/v1/otr-auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OTHER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsInvalidInputAndWrongRole() throws Exception {
        mockMvc.perform(post("/api/v1/otr-auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST.replace("20146", "not-a-number")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/otr-auditions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE,
                                new MemberPrincipal(3L, MemberType.APPLICANT, MemberStatus.ACTIVE)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/otr-auditions"))
                .andExpect(status().isUnauthorized());
    }

    private void createAsOwner() throws Exception {
        mockMvc.perform(post("/api/v1/otr-auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST))
                .andExpect(status().isCreated());
    }
}

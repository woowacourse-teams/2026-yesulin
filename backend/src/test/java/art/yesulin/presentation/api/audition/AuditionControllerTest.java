package art.yesulin.presentation.api.audition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.CreatePerformanceRoleCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AuditionControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER,
            MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileService fileService;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanUp() {
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void rejectsApplicantWithForbidden() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(OWNER_ID, MemberType.APPLICANT, MemberStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/auditions/{auditionId}", 1L)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsAnonymousWithUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/auditions/{auditionId}", 1L))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void createsRestoresAndUpdatesDraftBasicInformation() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID auditionId = UUID.randomUUID();
        String createRequest = """
                {
                  "id": "%s",
                  "performanceId": %d,
                  "title": "햄릿 오디션"
                }
                """.formatted(auditionId, performance.id());
        String location = mockMvc.perform(post("/api/v1/auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequest))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/auditions/" + auditionId))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.openRun").value(true))
                .andReturn().getResponse().getHeader("Location");
        String request = """
                {
                  "title": "리어왕 오디션"
                }
                """;

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/basic-information", auditionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("리어왕 오디션"))
                .andExpect(jsonPath("$.performanceStartDate").value("2026-11-01"))
                .andExpect(jsonPath("$.openRun").value(true));

        mockMvc.perform(get(location).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("리어왕 오디션"))
                .andExpect(jsonPath("$.performanceStartDate").value("2026-11-01"))
                .andExpect(jsonPath("$.openRun").value(true));
    }

    @Test
    void findsAuditionWithoutRehearsalVenue() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID auditionId = createAudition(performance.id());
        jdbcTemplate.update("""
                update auditions
                set rehearsal_venue_name = null,
                    rehearsal_road_address = null,
                    rehearsal_detail_address = null,
                    rehearsal_zonecode = null,
                    rehearsal_latitude = null,
                    rehearsal_longitude = null
                where public_id = ?
                """, auditionId.toString());

        mockMvc.perform(get("/api/v1/auditions/{auditionId}", auditionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rehearsalVenue").isEmpty());
    }

    @Test
    void findsAuditionsForOwnedPerformanceInLatestOrder() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID first = createAudition(performance.id());
        UUID latest = createAudition(performance.id());

        mockMvc.perform(get("/api/v1/auditions")
                .queryParam("performanceId", String.valueOf(performance.id()))
                .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditions.length()").value(2))
                .andExpect(jsonPath("$.auditions[0].id").value(latest.toString()))
                .andExpect(jsonPath("$.auditions[1].id").value(first.toString()))
                .andExpect(jsonPath("$.auditions[0].phase").value("DRAFT"))
                .andExpect(jsonPath("$.auditions[0].roleCount").value(0))
                .andExpect(jsonPath("$.auditions[0].databaseId").doesNotExist())
                .andExpect(jsonPath("$.counts.all").value(2))
                .andExpect(jsonPath("$.counts.draft").value(2));

        mockMvc.perform(get("/api/v1/auditions")
                        .queryParam("performanceId", String.valueOf(performance.id()))
                        .queryParam("phase", "OPEN")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditions.length()").value(0))
                .andExpect(jsonPath("$.counts.all").value(2));

        mockMvc.perform(get("/api/v1/auditions")
                        .queryParam("performanceId", String.valueOf(performance.id()))
                        .queryParam("keyword", "햄릿")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditions.length()").value(2));
    }

    @Test
    void savesAndFindsRoleSection() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID auditionId = createAudition(performance.id());
        String roleRequest = """
                {
                  "multipleRoleApplicationsAllowed": true,
                  "roles": [
                    {
                      "performanceRoleId": %d,
                      "recruitmentCount": 2,
                      "gender": "male",
                      "minimumAge": 20,
                      "maximumAge": 35
                    },
                    {
                      "performanceRoleId": %d,
                      "recruitmentCount": 1,
                      "gender": "ANY",
                      "minimumAge": 18,
                      "maximumAge": 40
                    }
                  ]
                }
                """.formatted(performance.roles().getFirst().id(), performance.roles().get(1).id());

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/roles", auditionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roleRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.multipleRoleApplicationsAllowed").value(true))
                .andExpect(jsonPath("$.roles[0].name").value("햄릿"))
                .andExpect(jsonPath("$.roles[0].gender").value("MALE"));

        mockMvc.perform(get("/api/v1/auditions/{auditionId}/roles", auditionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posting.id").value(auditionId.toString()))
                .andExpect(jsonPath("$.posting.databaseId").doesNotExist())
                .andExpect(jsonPath("$.roles.length()").value(2))
                .andExpect(jsonPath("$.roles[0].applicantCount").value(0));
    }

    @Test
    void deletesAuditionWithItsRoleSection() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID auditionId = createAudition(performance.id());
        saveRoleSection(auditionId, performance.roles().getFirst().id());

        mockMvc.perform(delete("/api/v1/auditions/{auditionId}", auditionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/auditions/{auditionId}", auditionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AUDITION_NOT_FOUND"));
        assertThat(roleSectionRepository.findAll()).isEmpty();
    }

    @Test
    void rejectsDeletingAuditionOfAnotherOwner() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID auditionId = createAudition(performance.id());
        MemberPrincipal otherProducer = new MemberPrincipal(OWNER_ID + 1, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(delete("/api/v1/auditions/{auditionId}", auditionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, otherProducer))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AUDITION_NOT_FOUND"));
        assertThat(auditionRepository.findByPublicId(auditionId)).isPresent();
    }

    private void saveRoleSection(UUID auditionId, long performanceRoleId) throws Exception {
        String request = """
                {
                  "multipleRoleApplicationsAllowed": false,
                  "roles": [
                    {
                      "performanceRoleId": %d,
                      "recruitmentCount": 1,
                      "gender": "ANY",
                      "minimumAge": 18,
                      "maximumAge": 40
                    }
                  ]
                }
                """.formatted(performanceRoleId);
        mockMvc.perform(put("/api/v1/auditions/{auditionId}/roles", auditionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk());
    }

    private UUID createAudition(long performanceId) throws Exception {
        UUID auditionId = UUID.randomUUID();
        String request = """
                {
                  "id": "%s",
                  "performanceId": %d,
                  "title": "햄릿 오디션"
                }
                """.formatted(auditionId, performanceId);
        String location = mockMvc.perform(post("/api/v1/auditions")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");
        return UUID.fromString(location.substring(location.lastIndexOf('/') + 1));
    }

    private PerformanceResult createPerformance() {
        return performanceService.create(
                OWNER_ID,
                new CreatePerformanceCommand(
                        uploadReadyImage(),
                        "햄릿",
                        new art.yesulin.application.performance.PerformanceVenueCommand(
                                "대학로예술극장", "서울특별시 종로구 대학로 12", "", "", null, null),
                        java.time.LocalDate.of(2026, 11, 1),
                        null,
                        List.of(
                                new CreatePerformanceRoleCommand("햄릿", "왕자"),
                                new CreatePerformanceRoleCommand("오필리어", "귀족 여성")
                        )
                )
        );
    }

    private long uploadReadyImage() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }

    @Test
    void rejectsPendingProducerWithForbidden() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER, MemberStatus.PENDING);

        mockMvc.perform(get("/api/v1/auditions/{auditionId}", 1L)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_INACTIVE_MEMBER"));
    }

}

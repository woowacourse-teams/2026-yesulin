package art.yesulin.presentation.api.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ScreeningTestFixture;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-review-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class ScreeningReviewControllerTest {

    private static final long OWNER_ID = 1L;
    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");
    private static final String REVIEWS_PATH =
            "/api/v1/audition-roles/{roleId}/screening-rounds/{round}/reviews";
    private static final String EMPTY_REVIEWS = "{\"reviews\": []}";
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER,
            MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ScreeningReviewRepository screeningReviewRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    private long roleId;

    @BeforeEach
    void setUp() {
        screeningReviewRepository.deleteAll();
        submissionRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        performanceRepository.deleteAll();
        fileAssetRepository.deleteAll();
        roleId = saveScreeningFixture();
    }

    @Test
    void savesReview() throws Exception {
        String request = """
                {
                  "submissionIds": ["b4472dce-52d0-41a9-baaa-c9e86e31b72b"],
                  "status": "etc",
                  "memo": "추가 논의",
                  "note": "발성 확인 필요"
                }
                """;

        mockMvc.perform(patch("/api/v1/audition-roles/{roleId}/screening-rounds/{round}/reviews", roleId, 1)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews[0].submissionId")
                        .value("b4472dce-52d0-41a9-baaa-c9e86e31b72b"))
                .andExpect(jsonPath("$.reviews[0].status").value("ETC"))
                .andExpect(jsonPath("$.reviews[0].memo").value("추가 논의"))
                .andExpect(jsonPath("$.reviews[0].note").value("발성 확인 필요"));
    }

    @Test
    void rejectsAbsentReviewForFirstRound() throws Exception {
        String request = """
                {
                  "submissionIds": ["b4472dce-52d0-41a9-baaa-c9e86e31b72b"],
                  "status": "ABSENT"
                }
                """;

        mockMvc.perform(patch(REVIEWS_PATH, roleId, 1)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SCREENING_REVIEW"));

        assertEquals(0, screeningReviewRepository.count());
    }

    private long saveScreeningFixture() {
        return new ScreeningTestFixture(
                performanceRepository, auditionRepository, roleSectionRepository, scheduleRepository,
                submissionRepository, fileAssetRepository
        ).save(OWNER_ID, SUBMISSION_ID, 1).roleId();
    }

    @Test
    void rejectsAnonymousWithUnauthorized() throws Exception {
        mockMvc.perform(patch(REVIEWS_PATH, 1L, 1)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EMPTY_REVIEWS))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void rejectsApplicantWithForbidden() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(OWNER_ID, MemberType.APPLICANT, MemberStatus.ACTIVE);

        mockMvc.perform(patch(REVIEWS_PATH, 1L, 1)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EMPTY_REVIEWS))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsPendingProducerWithForbidden() throws Exception {
        MemberPrincipal pending = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER, MemberStatus.PENDING);

        mockMvc.perform(patch(REVIEWS_PATH, 1L, 1)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, pending)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EMPTY_REVIEWS))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_INACTIVE_MEMBER"));
    }
}

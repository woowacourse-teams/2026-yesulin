package art.yesulin.presentation.api.screening;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.screening.SaveScreeningReviewsCommand;
import art.yesulin.application.screening.ScreeningReviewService;
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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class ScreeningSubmissionControllerTest {

    private static final long OWNER_ID = 1L;
    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");
    private static final MemberPrincipal PRODUCER = new MemberPrincipal(
            OWNER_ID, MemberType.PRODUCER, MemberStatus.ACTIVE
    );

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ScreeningReviewService reviewService;
    @Autowired
    private ScreeningReviewRepository reviewRepository;
    @Autowired
    private SubmissionRepository submissionRepository;
    @Autowired
    private AuditionScheduleRepository scheduleRepository;
    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;
    @Autowired
    private AuditionRepository auditionRepository;
    @Autowired
    private PerformanceRepository performanceRepository;
    @Autowired
    private FileReferenceRepository fileReferenceRepository;
    @Autowired
    private FileAssetRepository fileAssetRepository;

    private long roleId;

    @BeforeEach
    void setUp() {
        reviewRepository.deleteAll();
        submissionRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        performanceRepository.deleteAll();
        fileAssetRepository.deleteAll();
        roleId = fixture().save(OWNER_ID, SUBMISSION_ID, 2).roleId();
    }

    @Test
    void findsFirstRoundSubmissionsFromSubmittedApplication() throws Exception {
        mockMvc.perform(get(path(), roleId, 1).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posting.title").value("햄릿 오디션"))
                .andExpect(jsonPath("$.role.name").value("햄릿"))
                .andExpect(jsonPath("$.role.counts.pending").value(1))
                .andExpect(jsonPath("$.submissions[0].id").value(SUBMISSION_ID.toString()))
                .andExpect(jsonPath("$.submissions[0].name").value("김하린"))
                .andExpect(jsonPath("$.submissions[0].questions[0].answer").value("작품에 공감했습니다."))
                .andExpect(jsonPath("$.submissions[0].photos[0].url")
                        .value(org.hamcrest.Matchers.startsWith("https://storage.test/downloads/")))
                .andExpect(jsonPath("$.submissions[0].review.status").value("PENDING"));
    }

    @Test
    void findsSubmissionDetailByPublicUuid() throws Exception {
        mockMvc.perform(get(path() + "/{submissionId}", roleId, 1, SUBMISSION_ID)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submission.id").value(SUBMISSION_ID.toString()))
                .andExpect(jsonPath("$.submission.career[0].part").value("코델리아"));
    }

    @Test
    void includesOnlyApplicantsWhoPassedEveryPreviousRound() throws Exception {
        mockMvc.perform(get(path(), roleId, 2).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions").isEmpty());

        reviewService.save(
                OWNER_ID, roleId, 1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
        );

        mockMvc.perform(get(path(), roleId, 2).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions[0].id").value(SUBMISSION_ID.toString()));
    }

    @Test
    void hidesSubmissionOutsideCurrentRoleAndRound() throws Exception {
        mockMvc.perform(get(path() + "/{submissionId}", roleId, 1, UUID.randomUUID())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SCREENING_REVIEW_NOT_FOUND"));
    }

    @Test
    void rejectsAnonymousRequest() throws Exception {
        mockMvc.perform(get(path(), roleId, 1))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    private ScreeningTestFixture fixture() {
        return new ScreeningTestFixture(
                performanceRepository, auditionRepository, roleSectionRepository, scheduleRepository,
                submissionRepository, fileAssetRepository
        );
    }

    private String path() {
        return "/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions";
    }
}
